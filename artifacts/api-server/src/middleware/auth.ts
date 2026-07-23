import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { adminSessionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export async function adminAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "").trim();

    if (!token) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    const [session] = await db
      .select()
      .from(adminSessionsTable)
      .where(eq(adminSessionsTable.token, token))
      .limit(1);

    if (!session) {
      return res.status(401).json({
        error: "Session not found",
      });
    }

    if (new Date(session.expiresAt) < new Date()) {
      await db.delete(adminSessionsTable).where(eq(adminSessionsTable.token, token));

      return res.status(401).json({
        error: "Session expired",
      });
    }

    return next();
  } catch (err) {
    console.error("adminAuth error:", err);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
}
