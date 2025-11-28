import { Request, Response, NextFunction } from "express";
import { ingredientsService } from "./ingredients.service";

export const ingredientsController = {
  getAll: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ingredients = await ingredientsService.getAll();

      res.status(200).json({
        success: true,
        count: ingredients.length,
        data: ingredients,
      });
    } catch (err) {
      next(err);
    }
  },

  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      const ingredient = await ingredientsService.getById(id);

      res.status(200).json({
        success: true,
        data: ingredient,
      });
    } catch (err) {
      next(err);
    }
  },

  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ingredient = await ingredientsService.create(req.body);

      res.status(201).json({
        success: true,
        data: ingredient,
      });
    } catch (err) {
      next(err);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      const ingredient = await ingredientsService.update(id, req.body);

      res.status(200).json({
        success: true,
        data: ingredient,
      });
    } catch (err) {
      next(err);
    }
  },

  deactivate: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      await ingredientsService.deactivate(id);

      res.status(200).json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  addUnit: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      const unit = await ingredientsService.addUnit(id, req.body);

      res.status(201).json({
        success: true,
        data: unit,
      });
    } catch (err) {
      next(err);
    }
  },
saveFull: async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ingredient = await ingredientsService.saveFull(req.body);
    res.status(200).json({
      success: true,
      data: ingredient
    });
  } catch (err) {
    next(err);
  }
},



};
