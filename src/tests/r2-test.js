import { PutObjectCommand } from "@aws-sdk/client-s3";
import r2Client from "../lib/r2.js";
import fs from "fs";

async function testUpload() {
  try {
    const filePath = "C:/Users/valentin.levenier.DESARROLLO/Desktop/test.pdf";
    const fileBuffer = fs.readFileSync(filePath);

    const fileKey = "test.pdf"; // ← agrega esto

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: fileKey,
      Body: fileBuffer,
      ContentType: "application/pdf",
    });

    await r2Client.send(command);

    console.log("Subida OK →", fileKey);
  } catch (err) {
    console.error("Error subiendo:", err);
  }
}

testUpload();
