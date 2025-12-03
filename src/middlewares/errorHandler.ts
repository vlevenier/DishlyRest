import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class AppError extends Error implements ApiError {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: ApiError | ZodError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {

  // 🟠 1. Errores de validación (Zod)
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.issues.map((error) => ({
        field: error.path.join('.'),
        message: error.message,
      })),
    });
  }

  // 🔵 2. Errores operacionales (AppError)
  if (err instanceof AppError && err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // 🔴 3. Error desconocido (bug real o no controlado)
  console.error('UNEXPECTED ERROR:', err);

  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
};
