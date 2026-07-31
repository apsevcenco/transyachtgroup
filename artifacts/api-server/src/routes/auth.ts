import { Router, type IRouter } from "express";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { db } from "@workspace/db";
import { adminSessionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again later." },
});

const tokenHash = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

function decodeBase32(value: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = value.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const char of clean) {
    const index = alphabet.indexOf(char);
    if (index < 0) throw new Error("Invalid TOTP secret");
    bits += index.toString(2).padStart(5, "0");
  }
  return Buffer.from((bits.match(/.{8}/g) || []).map((byte) => parseInt(byte, 2)));
}

function verifyTotp(code: string, secret: string): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const key = decodeBase32(secret);
  const counter = Math.floor(Date.now() / 30_000);
  for (let offset = -1; offset <= 1; offset++) {
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64BE(BigInt(counter + offset));
    const digest = crypto.createHmac("sha1", key).update(buffer).digest();
    const start = digest[digest.length - 1] & 0x0f;
    const number =
      (((digest[start] & 0x7f) << 24) |
        (digest[start + 1] << 16) |
        (digest[start + 2] << 8) |
        digest[start + 3]) % 1_000_000;
    const expected = String(number).padStart(6, "0");
    if (crypto.timingSafeEqual(Buffer.from(code), Buffer.from(expected))) return true;
  }
  return false;
}

router.post("/admin/login", loginLimiter, async (req, res) => {
  try {
    res.setHeader("Cache-Control", "no-store");
    const password =
      typeof req.body?.password === "string" ? req.body.password : "";
    const adminPassword = process.env.ADMIN_PASSWORD;
    const totpSecret = process.env.ADMIN_TOTP_SECRET;

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
    if (totpSecret && !verifyTotp(String(req.body?.otp || ""), totpSecret)) {
      res.status(401).json({ error: "Invalid password or verification code" });
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);

    // A successful login revokes every older admin session. This limits the
    // useful lifetime of a copied bearer token and keeps one active operator.
    await db.delete(adminSessionsTable);
    await db.insert(adminSessionsTable).values({ token: tokenHash(token), expiresAt });

    res.json({ token, expiresAt: expiresAt.toISOString() });
  } catch (err) {
    logger.error({ err }, "Admin login failed");
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
        .where(eq(adminSessionsTable.token, tokenHash(token)));
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
      .where(eq(adminSessionsTable.token, tokenHash(token)))
      .limit(1);

    if (!session || new Date(session.expiresAt) < new Date()) {
      if (session) {
        await db
          .delete(adminSessionsTable)
          .where(eq(adminSessionsTable.token, tokenHash(token)));
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
