import { Router } from "express";
import { ingredientsController } from "./ingredients.controller";

const router = Router();

router.get("/", ingredientsController.getAll);
router.get("/:id", ingredientsController.getById);
router.post("/", ingredientsController.create);
router.put("/:id", ingredientsController.update);
router.delete("/:id", ingredientsController.deactivate);

// Unidad adicional del ingrediente
router.post("/:id/units", ingredientsController.addUnit);
router.post("/save-full", ingredientsController.saveFull);

export default router;
