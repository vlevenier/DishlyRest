import { Request, Response, NextFunction } from "express";
import * as recipeService from "../../modules/product_recipe/productRecipe.service";

export const getRecipeByVariant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const variantId = Number(req.params.variantId);
    const data = await recipeService.getRecipeByVariant(variantId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const createRecipeItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const variantId = Number(req.params.variantId);
    const { ingredient_id, quantity_base_per_unit } = req.body;

    if (!ingredient_id || !quantity_base_per_unit) {
      return res.status(400).json({ success: false, message: "Faltan campos obligatorios" });
    }

    const created = await recipeService.createRecipeItem({
      product_variant_id: variantId,
      ingredient_id,
      quantity_base_per_unit
    });

    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
};

export const updateRecipeItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const variantId = Number(req.params.variantId);
    const id = Number(req.params.id);
    const { ingredient_id, quantity_base_per_unit } = req.body;

    const updated = await recipeService.updateRecipeItem(id, {
      product_variant_id: variantId,
      ingredient_id,
      quantity_base_per_unit
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const deleteRecipeItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    await recipeService.deleteRecipeItem(id);
    res.json({ success: true, message: "Eliminado correctamente" });
  } catch (err) {
    next(err);
  }
};
