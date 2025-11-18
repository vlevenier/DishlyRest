import { Request, Response, NextFunction } from "express";
import {
  getVariantsByProductService,
  createVariantService,
  updateVariantService,
  softDeleteVariantService
} from "./product_variants.service";

export const getVariantsByProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const variants = await getVariantsByProductService(Number(req.params.productId));
    res.status(200).json({ success: true, data: variants });
  } catch (err) {
    next(err);
  }
};

export const createVariant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const variant = await createVariantService(req.body);
    res.status(201).json({ success: true, data: variant });
  } catch (err) {
    next(err);
  }
};

export const updateVariant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const variant = await updateVariantService(Number(req.params.id), req.body);
    res.status(200).json({ success: true, data: variant });
  } catch (err) {
    next(err);
  }
};

export const deleteVariant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const variant = await softDeleteVariantService(Number(req.params.id));
    res.status(200).json({ success: true, data: variant });
  } catch (err) {
    next(err);
  }
};
