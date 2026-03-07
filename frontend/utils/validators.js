export function isValidEmail(email = '') {
  return /\S+@\S+\.\S+/.test(email.trim());
}

export function validatePassword(password = '') {
  return password.length >= 6;
}
