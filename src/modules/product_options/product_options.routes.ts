import { Router } from "express";
import {
  getOptionsByProduct,
  createOption,
  updateOption,
  deleteOption
} from "./product_options.controller";

const router = Router();

router.get("/:productId", getOptionsByProduct);
router.post("/", createOption);
router.put("/:id", updateOption);
router.delete("/:id", deleteOption);

export default router;
