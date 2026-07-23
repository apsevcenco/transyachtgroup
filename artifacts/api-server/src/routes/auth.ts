import { Router, type IRouter } from "express";
import crypto from "crypto";
import { db } from "@workspace/db";
import { adminSessionsTable } from "@workspace/db/schema";
import { eq, gt } from "drizzle-orm";

const router: IRouter = Router();

router.post("/admin/login", async (req, res) => {
  try {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      res.status(500).json({ error: "Admin password not configured" });
      return;
    }

    if (password !== adminPassword) {
      res.status(401).json({ error: "Invalid password" });
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.insert(adminSessionsTable).values({ token, expiresAt });

    res.json({ token, expiresAt: expiresAt.toISOString() });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/logout", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (token) {
      await db.delete(adminSessionsTable).where(eq(adminSessionsTable.token, token));
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/check", async (req, res) => {
  try {
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
        await db.delete(adminSessionsTable).where(eq(adminSessionsTable.token, token));
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
