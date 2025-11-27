import jwt from "jsonwebtoken";
import crypto from "crypto";

export const signAccessToken = (user: any) => {
  return jwt.sign({
    user_id: user.id,
    email: user.email,
    role: user.role
  }, process.env.JWT_ACCESS_SECRET!, { expiresIn: "15m" });
};

export const signRefreshToken = () => {
  return crypto.randomBytes(48).toString("hex");
};

export const hashToken = (token: string) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};
