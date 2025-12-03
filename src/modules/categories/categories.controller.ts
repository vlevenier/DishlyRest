
import { Request, Response, NextFunction } from "express";
import * as categoriesService from "./categories.service";

export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await categoriesService.getAllCategories();
    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (err) {
    next(err);
  }
};

export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }

    const category = await categoriesService.createCategory(name, description);
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

export const updateCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, is_active } = req.body;
    const { id } = req.params;

    const updated = await categoriesService.updateCategory(
      Number(id),
      name,
      description,
      is_active
    );

    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const deleted = await categoriesService.deleteCategory(Number(id));

    res.status(200).json({ success: true, deleted });
  } catch (err) {
    next(err);
  }
};

export const softDeleteCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const deleted = await categoriesService.softDeleteCategory(Number(id));
    res.status(200).json({ success: true , deleted });
  } catch (err) {
    next(err);
  }   
};
