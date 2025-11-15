import { test, expect } from "@playwright/test";
const authFile = "playwright/.auth/user.json";
/* only authanticated users can view and browse recipes list */
test.describe("protected route", async () => {
  test("only autheneticated user can view and search in the browser", async ({
    page,
  }) => {
    await page.goto("/diet/browser/");
    //expect to be redirceted to /login
    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByRole("form", { name: "Login" })).toBeVisible();
    await page.fill('input[name="login"]', "mona");
    await page.fill('[name="login_password"]', "Mona191*");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*browser/);
  });

  test("only autheneticated user can view specific recipes", async ({
    page,
  }) => {
    //populate the data with a cake recipe
    await page.goto("/diet/recipes/cake");
    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByRole("form", { name: "Login" })).toBeVisible();
    await page.fill('input[name="login"]', "mona");
    await page.fill('[name="login_password"]', "Mona191*");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*recipes\/cake/);
  });
});

test.describe("browser Flow", () => {
  test.use({ storageState: authFile });

  test.beforeEach(async ({ page }) => {
    await page.goto("/diet/browser/discover");
  });

  test("should display empty state when no data matches the filter ", async ({
    page,
  }) => {
    await page.goto("/diet/browser/discover?name=fjdhg");
    //await page.getByLabel('Search recipes').fill('ASDFGHJKL');
    await expect(page.getByTestId("empty-data-message")).toBeVisible();
    await expect(page.getByText("No Data found.")).toBeVisible();
    await expect(page.getByTestId("paginator")).not.toBeVisible();
  });

  test("should display a card list when data is avaliable ", async ({
    page,
  }) => {
    //mock the data base and push a small number of recipes in the browser.
    //show loading state for a moment
    await expect(page.locator("#emptyDataMsg")).not.toBeVisible();
    await expect(page.locator("form#filterContainer")).toBeVisible();
    await expect(page.locator("#paginator")).toBeVisible();
    await expect(page.getByRole("div", { name: "Cake" })).toBeVisible(); // Seeded recipe
    await expect(page.locator(".recipe-card")).toHaveCount(12);
    await expect(page.getByRole("button", { name: "Next" })).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Previous" })
    ).not.toBeVisible();
    await expect(page.locator("#paginator #page")).toHaveValue("1");
  });

  test("should display a card list when more data is avaliable with paginator ", async ({
    page,
  }) => {
    //mock the data base and push more than two pages of recipes in the browser.
    //show loading state for moment
    await expect(page.locator("#emptyDataMsg")).not.toBeVisible();
    await expect(page.locator("form#filterContainer")).toBeVisible();
    await expect(page.locator("#paginator")).toBeVisible();
    await expect(page.getByRole("button", { name: "Next" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Previous" })
    ).not.toBeVisible();
    await expect(page.locator("#paginator #page")).toHaveValue("1");
    await expect(page.locator(".recipe-card")).toHaveCount(24);
    await page.getByRole("button", { name: "Next" }).click();
    //should scroll horzentally (or imitate) and load more cards exactly the same screen size
    await expect(page.getByRole("button", { name: "Next" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Previous" })).toBeVisible();
    await expect(page).toHaveURL(/.*page=2/);
    await expect(page.locator("#paginator #page")).toHaveValue("2");
    await page.getByRole("button", { name: "Next" }).click();
    //should scroll horzentally and load more cards

    const count = await page.locator(".recipe-card").count();
    await expect(page).toHaveURL(/.*page=3/);
    await expect(page.locator("#paginator #page")).toHaveValue("3");
    expect(count).toBeLessThan(24);
    await expect(page.getByRole("button", { name: "Next" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Previous" })).toBeVisible();
  });

  test("should display a the correct number of cards and pages based on screen size ", async ({
    page,
  }) => {
    //populate the data with 24 card
    await expect(page.getByRole("button", { name: "Next" })).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Previous" })
    ).not.toBeVisible();
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByRole("button", { name: "Next" })).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByRole("button", { name: "Next" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Previous" })).toBeVisible();
    // Capture first card's identity
    const firstCard = page.locator(".card").first();
    const firstCardText = await firstCard.textContent();

    // Resize to small screen
    await page.setViewportSize({ width: 640, height: 800 });

    // Verify the same card still appears first
    await expect(page.locator(".card").first()).toHaveText(firstCardText);

    // Navigate on small screen
    await expect(page.getByRole("button", { name: "Next" })).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();

    // Verify visible range of cards
    const cardsSm = page.locator(".card");
    await expect(cardsSm.first()).toBeVisible();
    await expect(cardsSm.last()).toBeVisible();
  });

  test("should redirect to details page by pressing the card", async ({
    page,
  }) => {
    // ✅ Select the card for "cake"
    const card = page.locator('div.card[title="cake"]');
    await expect(card).toBeVisible();

    // ✅ Extract data from the card
    const title = await card.locator(".card-title").innerText();
    const description = await card.locator(".card-description").innerText();
    const imageUrl = await card.locator("img").getAttribute("src");

    // ✅ Click and expect navigation
    await card.click();
    await expect(page).toHaveURL(/\d+\/recipes\/cake/);

    // ✅ Check core sections are visible
    await expect(page.locator("section.info-card")).toBeVisible();
    await expect(page.locator("section.metric-nutrients")).toBeVisible();
    await expect(page.locator("section#ingredients")).toBeVisible();
    await expect(page.locator("section#directions")).toBeVisible();

    // ✅ Verify that the data matches between card and detailed page
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    const detailImg = page.locator("section.info-card img");
    await expect(detailImg).toHaveAttribute("src", imageUrl);

    const detailDescription = await page
      .locator("section.info-card p")
      .innerText();
    expect(detailDescription.trim()).toContain(description.trim());
  });
});

/*note there are diffrent routes for browse => /discover it shows all public recipes or plans not the users
                                               /discover/plans or /discover/recipes should filter them 
                                               / will show users recipe and plans
                                               /recipes , /plans should only display the users reciper or the plan
                                               /collections will show both in collection view not plan to be implemented yet
                                                ? can be used to sort and filter by name , category , etc ...in all cases the users , collections and discover 
                                               
each recipe or plan has unique name per user but not for all users so two users can have the same recipe name but one user can't have the same name for two recipes
username are not unique but their emails must be unique
when a user use another user recipe it get prefixed by that user username or also with id or suffix num if a collison was detected 
*/
test.describe("details Flow", () => {
  test.use({ storageState: authFile });

  test.beforeEach(async ({ page }) => {
    await page.goto("/diet/recipes/cake");
  });

  test("should render the correct recipe data", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /cake/i })).toBeVisible();

    // ✅ Expect the recipe image to exist inside the info-card section
    const image = page.locator("section.info-card img");
    await expect(image).toBeVisible();
    const imgSrc = await image.getAttribute("src");
    expect(imgSrc).toMatch(/cake/i);

    // ✅ Expect the ingredient list to render correctly
    const ingredients = page.locator("section#ingredients li");
    await expect(ingredients).toHaveCountGreaterThan(0); // ensures non-empty list
    const ingredientsText = await ingredients.allTextContents();
    console.log("Ingredients:", ingredientsText);
    expect(
      ingredientsText.some((text) => /flour|sugar|eggs/i.test(text))
    ).toBeTruthy();

    // ✅ Expect the directions section to render properly
    const directions = page.locator("section#directions ol li");
    await expect(directions).toHaveCountGreaterThan(0);
    const firstDirection = await directions.first().innerText();
    expect(firstDirection.length).toBeGreaterThan(5);
  });

  test("should be able to quickly accsses the sections", async ({
    page,
  }) => {
     const quickAccess = page.locator('#quick-access'); // replace with your real selector
    const targetId = 'directions'; // the section id we want to land on
    const target = page.locator(`section#${targetId}`);
    await expect(target).toBeVisible({ timeout: 5000 }).catch(() => {
    // if the section may be off-screen but present, check presence instead
    expect(await target.count()).toBeGreaterThan(0);
    })
      // Trigger quick access action:
    // Example for <select>:
    // await quickAccess.selectOption({ value: targetId });

    // Example for clickable item:
    await page.click(`[data-quick-access="${targetId}"]`); // adjust to your markup

    // Wait small amount for scroll/animation to finish, but avoid arbitrary long waits
    await page.waitForTimeout(150); // small debounce; or wait on an animation class if available

    // Assert it's at least partially visible in the viewport now
    const visible = await isElementInViewport(target);
    expect(visible).toBeTruthy();


    });

 

//   test("should handel navigation between in sections while being consistant in diffrent screen size", async ({
//     page,
//   }) => {
    
//   });

  test("should display not found template with none existant recipes", async ({
    page,
  }) => {
    await page.goto("/diet/recipes/soup");
    await expect(
      page.getByRole("heading", { name: "Recipe Not Found" })
    ).toBeVisible();
    await expect(
      page.getByText(
        /no recipe with the name "a-recipe-that-does-not-exist" is available/i
      )
    ).toBeVisible();
  });
});


// async function isElementInViewport(locator) {
//   return await locator.evaluate((el) => {
//     const rect = el.getBoundingClientRect();
//     const horizontallyVisible = rect.right > 0 && rect.left < window.innerWidth;
//     const verticallyVisible = rect.bottom > 0 && rect.top < window.innerHeight;
//     return horizontallyVisible && verticallyVisible;
//   });
// }
