import { Router } from "express";
import {
  getComboItems,
  addComboItem,
  updateComboItem,
  deleteComboItem,
  getComboDetail,
  getAllCombos,
  createCombo
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


router.get("/:id", getComboDetail);

router.get("/", getAllCombos);

router.post("/", createCombo);



export default router;
