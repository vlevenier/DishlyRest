import { Request, Response, NextFunction } from "express";
import validator from "validator";

export const sanitizeInput = (req: Request, _res: Response, next: NextFunction) => {
  const sanitizeValue = (value: any): any => {
    if (typeof value === "string") {
      return validator.escape(value);
    }
    return value;
  };

  const sanitizeObject = (obj: any) => {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;

    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => {
        if (typeof value === "object" && !Array.isArray(value)) {
          return [key, sanitizeObject(value)];
        }
        return [key, sanitizeValue(value)];
      })
    );
  };

  if (req.body) req.body = sanitizeObject(req.body);
  if (req.params) req.params = sanitizeObject(req.params);

  // ✔️ NO tocar req.query (getter inmutable)
  // Guardamos la versión sanitizada en una propiedad nueva
(req as any).sanitizedQuery = sanitizeObject(req.query);

  next();
};
