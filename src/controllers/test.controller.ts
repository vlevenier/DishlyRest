import { Request, Response, NextFunction } from "express";
import { getAllUsersService } from "../services/test.service";

export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await getAllUsersService();
    return res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (err) {
    next(err);
  }
};
