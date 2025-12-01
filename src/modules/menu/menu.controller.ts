// src/controllers/menu.controller.ts

import { Request, Response, NextFunction } from "express";
import { menuService } from "./menu.service";

export const getMenu = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await menuService.getFullMenu();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
