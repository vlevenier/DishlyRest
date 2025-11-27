import { Request, Response, NextFunction } from "express";
import { authService } from "./auth.service";
import { postgresPool } from "../../config/postgres";
import { signAccessToken } from "../../utils/jwt";

export const authController = {
  async google(req: Request, res: Response, next: NextFunction) {
    try {
      const { id_token } = req.body;
      if (!id_token)
        return res
          .status(400)
          .json({ success: false, message: "Missing id_token" });

      const meta = { ip: req.ip, ua: req.headers["user-agent"] || "" };

      const { user, accessToken, refreshToken } =
        await authService.loginWithGoogle(id_token, meta);

      const cookieName = process.env.REFRESH_COOKIE_NAME || "rt";

      res.cookie(cookieName, refreshToken, {
        httpOnly: true,
        secure: process.env.REFRESH_COOKIE_SECURE === "true",
        sameSite:
          (process.env.REFRESH_COOKIE_SAMESITE as "lax" | "strict" | "none") ||
          "lax",
        maxAge: 1000 * 60 * 60 * 24 * 30,
        path: "/",
      });

      return res.json({ success: true, user, accessToken });
    } catch (err) {
      next(err);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const cookieName = process.env.REFRESH_COOKIE_NAME || "rt";
      const incoming = req.cookies?.[cookieName];
      console.log("here");
      console.log(incoming);
      if (!incoming)
        return res
          .status(401)
          .json({ success: false, message: "Missing refresh token" });

      const valid = await authService.validateRefreshToken(incoming);
      if (!valid)
        return res
          .status(401)
          .json({ success: false, message: "Invalid refresh token" });

      const meta = { ip: req.ip, ua: req.headers["user-agent"] || "" };
      const rotated = await authService.rotateRefreshToken(incoming, meta);

      if (!rotated)
        return res
          .status(401)
          .json({ success: false, message: "Invalid refresh token" });

      const { rows } = await postgresPool.query(
        `SELECT * FROM users WHERE id = $1 LIMIT 1`,
        [rotated.userId]
      );
      const user = rows[0];

      const newAccessToken = signAccessToken(user);

      res.cookie(cookieName, rotated.newRefreshToken, {
        httpOnly: true,
        secure: process.env.REFRESH_COOKIE_SECURE === "true",
        sameSite:
          (process.env.REFRESH_COOKIE_SAMESITE as "lax" | "strict" | "none") ||
          "lax",
        path: "/",
        maxAge: 1000 * 60 * 60 * 24 * 30,
      });

      return res.json({ success: true, accessToken: newAccessToken });
    } catch (err) {
      next(err);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      console.log("logout endpoint hit");
      const cookieName = process.env.REFRESH_COOKIE_NAME || "rt";
      const incoming = req.cookies?.[cookieName];

      if (incoming) await authService.revokeRefreshToken(incoming);

      res.clearCookie(cookieName, { path: "/" });

      return res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  async me(req: any, res: Response) {
    try {
      console.log("me endpoint hit  ");
      console.log(req.user);

      const user = req.user;
      return res.json({ success: true, user });
    } catch {
      return res.status(500).json({ success: false });
    }
  },
};
