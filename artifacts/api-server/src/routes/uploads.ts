import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { adminAuth } from "../middleware/auth";
import { uploadPublicImage } from "../lib/privateStorage";

const router: IRouter = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: "draft-8", legacyHeaders: false });

router.post("/admin/uploads/public-image", adminAuth, limiter, async (req, res) => {
  try {
    const contentType = String(req.headers["content-type"] || "").split(";")[0];
    const scope = String(req.headers["x-upload-scope"] || "vehicles");
    if (!["vehicles", "content-bg", "content-office"].includes(scope)) {
      res.status(400).json({ error: "Invalid upload scope" }); return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
      res.status(415).json({ error: "Only JPEG, PNG and WebP images are allowed" }); return;
    }
    const declared = Number(req.headers["content-length"] || 0);
    if (!declared || declared > 5 * 1024 * 1024) {
      res.status(413).json({ error: "Image must be between 1 byte and 5 MB" }); return;
    }
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of req) {
      const value = Buffer.from(chunk); size += value.length;
      if (size > 5 * 1024 * 1024) { res.status(413).json({ error: "Image exceeds 5 MB" }); return; }
      chunks.push(value);
    }
    const buffer = Buffer.concat(chunks);
    const jpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const png = buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const webp = buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
    if (!(jpeg || png || webp)) { res.status(415).json({ error: "Invalid image signature" }); return; }
    const url = await uploadPublicImage(buffer, contentType, scope as "vehicles" | "content-bg" | "content-office");
    res.status(201).json({ url });
  } catch (err) {
    req.log?.error?.({ err }, "Public image upload failed");
    res.status(500).json({ error: "Failed to upload image" });
  }
});

export default router;
