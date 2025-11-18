import { Router } from "express";
import {
  getComboItems,
  addComboItem,
  updateComboItem,
  deleteComboItem
} from "./combos.controller";

const router = Router();

// GET /combos/:comboId/items
router.get("/:comboId/items", getComboItems);

// POST /combos/items
router.post("/items", addComboItem);

// PUT /combos/items/:id
router.put("/items/:id", updateComboItem);

// DELETE /combos/items/:id
router.delete("/items/:id", deleteComboItem);

export default router;
