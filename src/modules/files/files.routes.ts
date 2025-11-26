import { Router } from "express";
import uploadsController from "./files.controller";
import multer from "multer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/", upload.single("file"), uploadsController.upload);
router.get("/url/:key", uploadsController.getUrl);
router.delete("/:key", uploadsController.delete);

export default router;
