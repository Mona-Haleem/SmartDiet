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


export const validators = {
  username: {
    validate: isValidUsername,
    errorMsg: 'Username must be at least 3 characters',
  },
  email: {
    validate: isValidEmail,
    errorMsg: 'Enter a valid email',
  },
  password: {
    validate: isValidPassword,
    errorMsg: 'Password must be at least 8 chars, include upper, lower & symbol',
  },
  confirm_password: {
    validate: (val, form) => isPasswordMatching(form.password.value, val),
    errorMsg: 'Passwords do not match',
  },
};
