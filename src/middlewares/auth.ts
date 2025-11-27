import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

export const authRequired = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log("authRequired middleware hit");
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Missing token" });
    }
    console.log("Pass bearer token check", header);

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as any;

    req.user = {
      id: decoded?.id,
      email: decoded?.email,
      role: decoded?.role,
    };

    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

export const adminRequired = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.role !== "admin") {
    return res
      .status(403)
      .json({ success: false, message: "Admin privileges required" });
  }
  next();
};
