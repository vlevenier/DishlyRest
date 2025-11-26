import { Router } from "express";
import multer from "multer";
import InvoicesController from "./invoices.controller";

const upload = multer(); // memoria →

const router = Router();

router.post("/", upload.single("file"), InvoicesController.create);
router.put("/:id", upload.single("file"), InvoicesController.update);
router.get("/", InvoicesController.getInvoices);
router.get("/:id", InvoicesController.getById);
router.delete("/:id", InvoicesController.delete);

export default router;
