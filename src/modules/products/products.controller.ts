import { Request, Response, NextFunction } from "express";
import * as productService from "./products.service";

export const getProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await productService.getAllProducts();
    res.status(200).json({ success: true, count: products.length, data: products });
  } catch (err) {
    next(err);
  }
};

export const getProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const product = await productService.getProductById(id);

    if (!product) {
      return res.status(404).json({ success: false, message: "Producto no encontrado" });
    }

    res.status(200).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category_id, name, description, base_price, image_url, is_combo } = req.body;

    if (!category_id || !name || !base_price) {
      return res.status(400).json({ success: false, message: "Faltan campos obligatorios" });
    }

    const created = await productService.createProduct({
      category_id,
      name,
      description,
      base_price,
      image_url,
      is_combo: is_combo || false
    });

    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const { category_id, name, description, base_price, image_url, is_combo, active } = req.body;

    const updated = await productService.updateProduct(id, {
      category_id,
      name,
      description,
      base_price,
      image_url,
      is_combo,
      active
    });

    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const deleted = await productService.deleteProduct(id);
    res.status(200).json({ success: true, deleted });
  } catch (err) {
    next(err);
  }
};
