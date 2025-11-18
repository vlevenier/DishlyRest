import { Response } from 'express';

interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

interface ErrorResponse {
  success: false;
  message: string;
  errors?: unknown;
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
): Response<SuccessResponse<T>> => {
  return res.status(statusCode).json({
    success: true,
    data,
    ...(message && { message }),
  });
};

export const sendError = (
  res: Response,
  message: string,
  statusCode: number = 400,
  errors?: unknown
): Response<ErrorResponse> => {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors }),
  });
};

export const sendPaginated = <T>(
  res: Response,
  data: T[],
  page: number,
  limit: number,
  total: number,
  message?: string
): Response => {
  return res.status(200).json({
    success: true,
    data,
    ...(message && { message }),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
};