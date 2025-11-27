import { Router } from "express";
import { authController } from "./auth.controller";
import { authRequired } from "../../middlewares/auth";

const router = Router();

router.post("/google", authController.google);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);
router.get("/me", authRequired, authController.me);

export default router;
