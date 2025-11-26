import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import r2Client from "../../lib/r2.js";
import crypto from "crypto";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

class UploadsService {
  async uploadFile(file: Express.Multer.File) {
    if (!file) throw new Error("No file provided");

    const key = `uploads/${Date.now()}-${crypto.randomUUID()}-${file.originalname}`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await r2Client.send(command);

    return { key };
  }

  async getSignedUrl(key: string) {
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
    });

    const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 60 * 5 });

    return { url: signedUrl };
  }

  async deleteFile(key: string) {
    const command = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
    });

    await r2Client.send(command);

    return { deleted: true };
  }
}

export default new UploadsService();
