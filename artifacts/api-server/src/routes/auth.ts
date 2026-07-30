import { Router, type IRouter } from "express";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { db } from "@workspace/db";
import { adminSessionsTable } from "@workspace/db/schema";
import { eq, lt } from "drizzle-orm";

const router: IRouter = Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again later." },
});

router.post("/admin/login", loginLimiter, async (req, res) => {
  try {
    res.setHeader("Cache-Control", "no-store");
    const password =
      typeof req.body?.password === "string" ? req.body.password : "";
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      res.status(500).json({ error: "Admin password not configured" });
      return;
    }

    const suppliedHash = crypto.createHash("sha256").update(password).digest();
    const expectedHash = crypto
      .createHash("sha256")
      .update(adminPassword)
      .digest();
    if (!crypto.timingSafeEqual(suppliedHash, expectedHash)) {
      res.status(401).json({ error: "Invalid password" });
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db
      .delete(adminSessionsTable)
      .where(lt(adminSessionsTable.expiresAt, new Date()));
    await db.insert(adminSessionsTable).values({ token, expiresAt });

    res.json({ token, expiresAt: expiresAt.toISOString() });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/logout", async (req, res) => {
  try {
    res.setHeader("Cache-Control", "no-store");
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (token) {
      await db
        .delete(adminSessionsTable)
        .where(eq(adminSessionsTable.token, token));
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/check", async (req, res) => {
  try {
    res.setHeader("Cache-Control", "no-store");
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      res.status(401).json({ authenticated: false });
      return;
    }

    const [session] = await db
      .select()
      .from(adminSessionsTable)
      .where(eq(adminSessionsTable.token, token))
      .limit(1);

    if (!session || new Date(session.expiresAt) < new Date()) {
      if (session) {
        await db
          .delete(adminSessionsTable)
          .where(eq(adminSessionsTable.token, token));
      }
      res.status(401).json({ authenticated: false });
      return;
    }

    res.json({ authenticated: true });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
