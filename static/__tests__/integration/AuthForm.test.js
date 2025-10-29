import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";

jest.mock("../../common/script.js", () => {
  const ApiService =
    require("../../scripts_module/helpers/fetchData/ApiService.js").default;
  const QueryCache =
    require("../../scripts_module/helpers/fetchData/QueryCache.js").default;
  const QueryService =
    require("../../scripts_module/helpers/fetchData/QueryService.js").default;

  const apiService = new ApiService();
  const cache = new QueryCache();
  const queryService = new QueryService(apiService, cache);

  return { queryService };
});

import AuthForm from "../../scripts_module/ComponentsClasses/AuthForm.js";
import Component from "../../scripts_module/ComponentsClasses/Component.js";
import { queryService } from "../../common/script.js";

describe("AuthForm - Integration Tests", () => {
  let container;
  let form;
  let authForm;

  beforeEach(() => {
    // Reset component instances
    Component.instances = {};

    // Setup DOM
    container = document.createElement("div");
    container.innerHTML = `
      <form id="auth_form" name="login" x-data="{errors:[],inputRefs:{}}">
        <div x-ref="error-container"></div>
        <p>
          <label>Login:</label>
          <input name="login" type="text" />
        </p>
        <p class="error-target"></p>
        <p>
          <label>Password:</label>
          <input name="login_password" type="password" />
        </p>
        <p class="error-target"></p>
        <button type="submit">Submit</button>
      </form>
    `;
    document.body.appendChild(container);

    form = container.querySelector("form");

    // Mock Alpine.$data
    global.Alpine.$data = jest.fn(() => ({
      $refs: {
        login: el.querySelector('[name="login"]'),
        login_password: el.querySelector('[name="login_password"]'),
        "error-container": el.querySelector('[x-ref="error-container"]'),
      },
      errors: [],
      inputRefs: {
        login: el.querySelector('[name="login"]'),
        login_password: el.querySelector('[name="login_password"]'),
      },
    }));

    global.fetch.mockClear();
  });

  afterEach(() => {
    document.body.removeChild(container);
    Component.instances = {};
  });

  describe("initialization", () => {
    it("should create AuthForm instance", () => {
      authForm = new AuthForm(
        form,
        { "error-container": form.querySelector('[x-ref="error-container"]') },
        { errors: [], inputRefs: {} }
      );

      expect(authForm).toBeInstanceOf(AuthForm);
      expect(authForm.$el).toBe(form);
    });

    it("should set instance ID on form element", () => {
      authForm = new AuthForm(
        form,
        { "error-container": form.querySelector('[x-ref="error-container"]') },
        { errors: [], inputRefs: {} }
      );

      expect(form.dataset.instanceId).toBeDefined();
    });

    it("should register in Component.instances", () => {
      authForm = new AuthForm(
        form,
        { "error-container": form.querySelector('[x-ref="error-container"]') },
        { errors: [], inputRefs: {} }
      );

      const instanceId = form.dataset.instanceId;
      expect(Component.instances[instanceId]).toBe(authForm);
    });
  });

  describe("validateForm", () => {
    beforeEach(() => {
      authForm = new AuthForm(
        form,
        { "error-container": form.querySelector('[x-ref="error-container"]') },
        {
          errors: [],
          inputRefs: {
            login: form.querySelector('[name="login"]'),
            login_password: form.querySelector('[name="login_password"]'),
          },
        }
      );
    });

    it("should throw error for invalid username", () => {
      const ctx = { body: null };
      form.querySelector('[name="login"]').value = "in";
      form.querySelector('[name="login_password"]').value = "password";

      expect(() => authForm.validateForm(ctx)).toThrow("Invalid form entries");
    });

    it("should throw error for empty password", () => {
      const ctx = { body: null };
      form.querySelector('[name="login"]').value = "user@example.com";
      form.querySelector('[name="login_password"]').value = "";

      expect(() => authForm.validateForm(ctx)).toThrow("Invalid form entries");
    });

    it("should pass validation for valid inputs", () => {
      const ctx = { body: null };
      form.querySelector('[name="login"]').value = "user@example.com";
      form.querySelector('[name="login_password"]').value = "password123";

      expect(() => authForm.validateForm(ctx)).not.toThrow();
      expect(ctx.body).toBeInstanceOf(FormData);
    });

    it("should display error messages for invalid fields", () => {
      const ctx = { body: null };
      form.querySelector('[name="login"]').value = "ab"; // Too short

      try {
        authForm.validateForm(ctx);
      } catch (e) {
        // Expected to throw
      }

      const errorElements = container.querySelectorAll(".input-error");
      expect(errorElements.length).toBeGreaterThan(0);
    });

    it("should populate context.body with FormData", () => {
      const ctx = { body: null };
      form.querySelector('[name="login"]').value = "user@example.com";
      form.querySelector('[name="login_password"]').value = "password123";

      authForm.validateForm(ctx);

      expect(ctx.body).toBeInstanceOf(FormData);
      expect(ctx.body.get("login")).toBe("user@example.com");
      expect(ctx.body.get("login_password")).toBe("password123");
    });
  });

  describe("submitForm", () => {
    beforeEach(() => {
      authForm = new AuthForm(
        form,
        { "error-container": form.querySelector('[x-ref="error-container"]') },
        {
          errors: [],
          inputRefs: {
            login: form.querySelector('[name="login"]'),
            login_password: form.querySelector('[name="login_password"]'),
          },
        }
      );
    });

    it("should call queryService with correct parameters", async () => {
      const querySpy = jest.spyOn(queryService, "query");

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ message: "Logged in successfully" }),
        text: async () => "<div>Logged in successfully</div>",
      });

      form.querySelector('[name="login"]').value = "user@example.com";
      form.querySelector('[name="login_password"]').value = "password123";

      const event = new Event("submit");
      await authForm.submitForm(event, "/login/");

      expect(querySpy).toHaveBeenCalledWith(
        "/login/",
        expect.objectContaining({
          queryFn: expect.any(Function),
          prefetch: expect.any(Function),
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
          ttl: Infinity,
        })
      );
    });

    // it("should handle successful submission", async () => {
    //   const htmlResponse = '<div class="success">Logged in</div>';

    //   global.fetch.mockResolvedValueOnce({
    //     ok: true,
    //     status: 200,
    //     headers: new Headers({ "content-type": "application/json" }),
    //     json: async () => ({ message: "Logged in successfully" }),
    //     text: async () => "<div>Logged in successfully</div>",
    //   });

    //   form.querySelector('[name="login"]').value = "user@example.com";
    //   form.querySelector('[name="login_password"]').value = "password123";

    //   const event = new Event("submit");
    //   await authForm.submitForm(event, "/login/");

    //   // Should call swapContent (which we can't fully test without mocking more)
    //   expect(global.fetch).toHaveBeenCalled();
    // });

    it("should handle validation errors before submission", async () => {
      form.querySelector('[name="login"]').value = "invalid";
      form.querySelector('[name="login_password"]').value = "";

      const event = new Event("submit");
      await authForm.submitForm(event, "/login/");

      // Should not call fetch if validation fails
      expect(global.fetch).not.toHaveBeenCalled();
    });

    // it("should call showServerErrors on API error", async () => {
    //   const errorResponse = {
    //     errors: {
    //       login: ["Invalid credentials"],
    //     },
    //   };

    //   global.fetch.mockResolvedValueOnce({
    //     ok: false,
    //     status: 400,
    //     headers: new Headers({ "content-type": "application/json" }),
    //     json: async () => ({
    //       message: "There were validation errors.",
    //       errors: { login: ["Invalid credentials"] },
    //     }),
    //     text: async () =>
    //       JSON.stringify({
    //         message: "There were validation errors.",
    //         errors: { login: ["Invalid credentials"] },
    //       }),
    //   });

    //   const showErrorsSpy = jest.spyOn(authForm, "showServerErrors");

    //   form.querySelector('[name="login"]').value = "user@example.com";
    //   form.querySelector('[name="login_password"]').value = "wrongpassword";

    //   const event = new Event("submit");

    //   try {
    //     await authForm.submitForm(event, "/login/");
    //   } catch (e) {
    //     // Expected to throw
    //   }

    //   expect(showErrorsSpy).toHaveBeenCalled();
    // });
  });

  describe("showServerErrors", () => {
    beforeEach(() => {
      authForm = new AuthForm(
        form,
        { "error-container": form.querySelector('[x-ref="error-container"]') },
        { errors: [], inputRefs: {} }
      );
    });

    it("should populate errors array from response", async () => {
      const response = {
        response: {
          data: {
            errors: {
              login: ["Invalid email"],
              password: ["Too short"],
            },
          },
        },
      };

      await authForm.showServerErrors(response);

      expect(authForm.$data.errors).toContain("Invalid email");
      expect(authForm.$data.errors).toContain("Too short");
      expect(authForm.$data.errors.length).toBe(2);
    });

    it("should handle missing errors object", async () => {
      const response = {
        response: {
          data: {},
          message: "Server error",
        },
      };

      await authForm.showServerErrors(response);

      expect(authForm.$data.errors).toContain("Server error");
    });

    it("should handle completely missing response data", async () => {
      const response = {};

      await authForm.showServerErrors(response);

      expect(authForm.$data.errors).toContain("Unexpected error");
    });
  });

  describe("swapContent", () => {
    beforeEach(() => {
      authForm = new AuthForm(
        form,
        { "error-container": form.querySelector('[x-ref="error-container"]') },
        { errors: [], inputRefs: {} }
      );
    });

    it("should call queryService to fetch new content", async () => {
      const querySpy = jest.spyOn(queryService, "query");

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "text/html" }),
        json: async () => {
          throw new Error("Not JSON");
        },
        text: async () => '<form id="register_form">Register</form>',
      });

      await authForm.swapContent("/register/");

      expect(querySpy).toHaveBeenCalledWith(
        "/register/",
        expect.objectContaining({
          queryFn: expect.any(Function),
          onSuccess: expect.any(Function),
          ttl: Infinity,
        })
      );
    });
  });

  describe("password confirmation validation", () => {
    beforeEach(() => {
      // Setup registration form with confirmation
      container.innerHTML = `
        <form id="auth_form" name="register" x-data="{errors:[],inputRefs:{}}">
          <div x-ref="error-container"></div>
          <p>
            <label>Username:</label>
            <input name="username" type="text" />
          </p>
          <div class="error-target"></div>
          <p>
            <label>Email:</label>
            <input name="email" type="email" />
          </p>
          <div class="error-target"></div>
          <p>
            <label>Password:</label>
            <input name="password" type="password" />
          </p>
          <div class="error-target"></div>
          <p>
            <label>Confirm Password:</label>
            <input name="confirmation" type="password" />
          </p>
          <div class="error-target"></div>
          <button type="submit">Register</button>
        </form>
      `;

      form = container.querySelector("form");

      authForm = new AuthForm(
        form,
        { "error-container": form.querySelector('[x-ref="error-container"]') },
        {
          errors: [],
          inputRefs: {
            username: form.querySelector('[name="username"]'),
            email: form.querySelector('[name="email"]'),
            password: form.querySelector('[name="password"]'),
            confirmation: form.querySelector('[name="confirmation"]'),
          },
        }
      );
    });

    it("should validate matching passwords", () => {
      const ctx = { body: null };
      form.querySelector('[name="username"]').value = "testuser";
      form.querySelector('[name="email"]').value = "test@example.com";
      form.querySelector('[name="password"]').value = "Pass123!";
      form.querySelector('[name="confirmation"]').value = "Pass123!";

      expect(() => authForm.validateForm(ctx)).not.toThrow();
    });

    it("should reject non-matching passwords", () => {
      const ctx = { body: null };
      form.querySelector('[name="username"]').value = "testuser";
      form.querySelector('[name="email"]').value = "test@example.com";
      form.querySelector('[name="password"]').value = "Pass123!";
      form.querySelector('[name="confirmation"]').value = "Different!";

      expect(() => authForm.validateForm(ctx)).toThrow();
    });

    it("should validate password strength", () => {
      const ctx = { body: null };
      form.querySelector('[name="username"]').value = "testuser";
      form.querySelector('[name="email"]').value = "test@example.com";
      form.querySelector('[name="password"]').value = "weak";
      form.querySelector('[name="confirmation"]').value = "weak";

      expect(() => authForm.validateForm(ctx)).toThrow();
    });
  });
});
