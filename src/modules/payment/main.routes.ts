import { Router } from "express";
import { createOrder } from "./main.controller";

const router = Router();

router.post("/smartpoint", createOrder);

export default router;
