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
    const items = req.body;

    console.log("Received data:", items);

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Debe enviar un array" });
    }

    const created = [];

    for (const item of items) {
      if (!item.ingredient_id || item.quantity_original == null) {
        return res.status(400).json({
          success: false,
          message: "ingredient_id y quantity_original son obligatorios"
        });
      }

      const row = await recipeService.createRecipeItem({
        product_variant_id: variantId,
        ingredient_id: item.ingredient_id,
        quantity_original: item.quantity_original,
        ingredient_unit_id: item.ingredient_unit_id ?? null
      });

      created.push(row);
    }

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
