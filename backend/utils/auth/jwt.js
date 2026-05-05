import jwt from "jsonwebtoken";

export function generateToken(payload) {
  const secret = process.env.JWT_SECRET;
  const expiresAt = process.env.JWT_EXPIRES_IN;
  return jwt.sign(payload, secret, { expiresIn: expiresAt });
}

export function verifyToken(token) {
  const secret = process.env.JWT_SECRET;
  return jwt.verify(token, secret);
}

generateToken({ role: "admin" });
export default {
  generateToken,
  verifyToken,
};
