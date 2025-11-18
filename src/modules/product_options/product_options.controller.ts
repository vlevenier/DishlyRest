import { Request, Response, NextFunction } from "express";
import {
  getOptionsByProductService,
  createOptionService,
  updateOptionService,
  softDeleteOptionService
} from "./product_options.service";

export const getOptionsByProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const options = await getOptionsByProductService(Number(req.params.productId));
    res.status(200).json({ success: true, data: options });
  } catch (err) {
    next(err);
  }
};

export const createOption = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const option = await createOptionService(req.body);
    res.status(201).json({ success: true, data: option });
  } catch (err) {
    next(err);
  }
};

export const updateOption = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const option = await updateOptionService(Number(req.params.id), req.body);
    res.status(200).json({ success: true, data: option });
  } catch (err) {
    next(err);
  }
};

export const deleteOption = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const option = await softDeleteOptionService(Number(req.params.id));
    res.status(200).json({ success: true, data: option });
  } catch (err) {
    next(err);
  }
};
