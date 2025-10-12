// lib/jwt.js
import jwt from "jsonwebtoken";
const SECRET = process.env.JWT_SECRET;

export function sign(payload, opts = { expiresIn: "7d" }) {
  return jwt.sign(payload, SECRET, opts);
}

export function verify(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch (e) {
    return null;
  }
}
