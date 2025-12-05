import { Request, Response, NextFunction } from "express";
import { 
  getComboItemsService,
  addComboItemService,
  updateComboItemService,
  deleteComboItemService,
  getComboDetailService,
  getAllCombosService,
  createComboService,
  
} from "./combos.service";




export const getAllCombos = async (req: Request, res: Response) => {
  try {
    const combos = await getAllCombosService();
    return res.status(200).json({ ok: true, data: combos });
  } catch (error) {
    console.error('Error fetching combos:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
};
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



export const getComboDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const comboId = Number(req.params.id);

    const combo = await getComboDetailService(comboId);
    if (!combo) {
      return res.status(404).json({ success: false, message: "Combo no encontrado" });
    }

    return res.status(200).json({
      success: true,
      data: combo
    });
  } catch (err) {
    next(err);
  }
};


export const createCombo = async (req: Request, res: Response) => {
  try {
    const newCombo = await createComboService(req.body);

    return res.status(201).json({
      ok: true,
      data: newCombo
    });
  } catch (error: any) {
    console.error("Error creating combo:", error);

    return res.status(400).json({
      ok: false,
      error: error.message || "Could not create combo"
    });
  }
};