import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { adminAuth } from "../middleware/auth";
import { deletePublicImage, uploadPublicImage } from "../lib/privateStorage";

const router: IRouter = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: "draft-8", legacyHeaders: false });

router.post("/admin/uploads/public-image", adminAuth, limiter, async (req, res) => {
  try {
    const contentType = String(req.headers["content-type"] || "").split(";")[0];
    const scope = String(req.headers["x-upload-scope"] || "vehicles");
    if (!["vehicles", "content-bg", "content-office", "guides", "news", "proposals"].includes(scope)) {
      res.status(400).json({ error: "Invalid upload scope" }); return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
      res.status(415).json({ error: "Only JPEG, PNG and WebP images are allowed" }); return;
    }
    const declared = Number(req.headers["content-length"] || 0);
    // A reverse proxy may legitimately forward the upload with chunked
    // transfer encoding and no Content-Length. Treat the header as an early
    // upper-bound check only; the loop below remains the authoritative limit.
    if (Number.isFinite(declared) && declared > 5 * 1024 * 1024) {
      res.status(413).json({ error: "Image must not exceed 5 MB" }); return;
    }
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of req) {
      const value = Buffer.from(chunk); size += value.length;
      if (size > 5 * 1024 * 1024) { res.status(413).json({ error: "Image exceeds 5 MB" }); return; }
      chunks.push(value);
    }
    const buffer = Buffer.concat(chunks);
    if (buffer.length === 0) {
      res.status(400).json({ error: "Image file is empty" }); return;
    }
    const jpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const png = buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const webp = buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
    if (!(jpeg || png || webp)) { res.status(415).json({ error: "Invalid image signature" }); return; }
    const url = await uploadPublicImage(buffer, contentType, scope as "vehicles" | "content-bg" | "content-office" | "guides" | "news" | "proposals");
    res.status(201).json({ url });
  } catch (err) {
    req.log?.error?.({ err }, "Public image upload failed");
    const storageMessage =
      err instanceof Error && err.message
        ? err.message.slice(0, 240)
        : "Unknown storage error";
    res.status(500).json({
      error: `Storage rejected image upload: ${storageMessage}`,
    });
  }
});

router.delete("/admin/uploads/public-image", adminAuth, limiter, async (req, res) => {
  try {
    const url = typeof req.body?.url === "string" ? req.body.url.trim() : "";
    if (!url || url.length > 2000) {
      res.status(400).json({ error: "A valid image URL is required" }); return;
    }
    res.json({ success: true, objectDeleted: await deletePublicImage(url) });
  } catch (err) {
    req.log?.error?.({ err }, "Public image deletion failed");
    res.status(500).json({ error: "Failed to delete image" });
  }
});

export default router;
