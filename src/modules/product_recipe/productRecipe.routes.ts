import { Router } from "express";
import { 
  getRecipeByVariant,
  createRecipeItem,
  updateRecipeItem,
  deleteRecipeItem
} from "../product_recipe/productRecipe.controller";

const router = Router();

router.get("/:variantId", getRecipeByVariant);
router.post("/:variantId", createRecipeItem);
router.put("/:variantId/:id", updateRecipeItem);
router.delete("/:variantId/:id", deleteRecipeItem);

export default router;
