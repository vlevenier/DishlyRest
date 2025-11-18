import { Router } from "express";
import { getAllUsers } from "../controllers/test.controller";


const router = Router();

router.get("/", getAllUsers);

export default router;
