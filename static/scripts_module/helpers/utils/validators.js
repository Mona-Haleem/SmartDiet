export function isValidPassword(password) {
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/;
  return strongPasswordRegex.test(password);
}

export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidUsername(username) {
  return username.trim().length >= 3;
}

export function isPasswordMatching(password, confirmPassword) {
  return password === confirmPassword;
}

export function isValidImg(img) {
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!allowedTypes.includes(img.type)) {
    console.error("Unsupported file type.");
    return false;
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (img.size > maxSize) {
    console.error("File size exceeds limit of 5MB.");
    return false;
  }

  return true;
}
export function isValidImgurl(imgUrl) {
  const regex =
    /^(https?:\/\/.*\.(?:png|jpg|jpeg|gif|bmp|svg|webp))$|^data:image\/(jpeg|png|gif|bmp|svg)\;base64,.+/i;

  return regex.test(imgUrl);
}
export const validators = {
  username: {
    validate: isValidUsername,
    errorMsg: "Username must be at least 3 characters",
  },
  email: {
    validate: isValidEmail,
    errorMsg: "Enter a valid email",
  },
  login: {
    validate: (input) => isValidEmail(input) || isValidUsername(input),
    errorMsg: "Enter a valid email",
  },
  login_password: {
    validate: (input) => !!input,
    errorMsg: "Enter your password",
  },
  password: {
    validate: isValidPassword,
    errorMsg:
      "Password must be at least 8 chars, include upper, lower & symbol",
  },
  confirmation: {
    validate: (val, password) => isPasswordMatching(password, val),
    errorMsg: "Passwords do not match",
  },
};
