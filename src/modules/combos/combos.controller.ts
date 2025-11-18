import { Request, Response, NextFunction } from "express";
import { 
  getComboItemsService,
  addComboItemService,
  updateComboItemService,
  deleteComboItemService
} from "./combos.service";

export const getComboItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const comboId = Number(req.params.comboId);
    const items = await getComboItemsService(comboId);

    return res.status(200).json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (err) {
    next(err);
  }
};


export const addComboItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const newItem = await addComboItemService(req.body);

    return res.status(201).json({
      success: true,
      data: newItem
    });
  } catch (err) {
    next(err);
  }
};


export const updateComboItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await updateComboItemService(Number(req.params.id), req.body);

    return res.status(200).json({
      success: true,
      data: updated
    });
  } catch (err) {
    next(err);
  }
};


export const deleteComboItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await deleteComboItemService(Number(req.params.id));

    return res.status(200).json({
      success: true,
      data: deleted
    });
  } catch (err) {
    next(err);
  }
};
