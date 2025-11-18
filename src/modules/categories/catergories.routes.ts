import { Router } from "express";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from "./categories.controller";

const router = Router();

// Admin
router.get("/", getCategories);
router.post("/", createCategory);
router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory);

export default router;
