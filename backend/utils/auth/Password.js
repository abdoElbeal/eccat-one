import bcrypt from "bcryptjs";
import { pwnedPassword } from "hibp";

async function hashPassword(password) {
  const saltRounds = 12;
  const hash = await bcrypt.hash(password, saltRounds);
  return hash;
}

async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

function validatePasswordConfirmation(password, ConfirmPassword) {
  if (password !== ConfirmPassword) {
    throw new Error("Password do not match");
  }
}

async function valdiatePassword(password) {
  // check for leakedPassword
  const count = await pwnedPassword(password);
  return count > 0;
}

export default {
  hashPassword,
  comparePassword,
  validatePasswordConfirmation,
  valdiatePassword,
};
