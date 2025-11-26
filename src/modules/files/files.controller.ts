import { Request, Response } from "express";
import uploadsService from "./files.service";

class UploadsController {
  async upload(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const result = await uploadsService.uploadFile(req.file);

      return res.json({
        success: true,
        key: result.key,
      });
    } catch (err: any) {
      console.error("Upload error:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  async getUrl(req: Request, res: Response) {
    try {
      const { key } = req.params;

      if (!key) return res.status(400).json({ error: "Missing key" });

      const result = await uploadsService.getSignedUrl(key);

      return res.json({
        success: true,
        url: result.url,
      });
    } catch (err: any) {
      console.error("Signed URL error:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { key } = req.params;

      if (!key) return res.status(400).json({ error: "Missing key" });

      const result = await uploadsService.deleteFile(key);

      return res.json({
        success: true,
        deleted: result.deleted,
      });
    } catch (err: any) {
      console.error("Delete error:", err);
      return res.status(500).json({ error: err.message });
    }
  }
}

export default new UploadsController();
