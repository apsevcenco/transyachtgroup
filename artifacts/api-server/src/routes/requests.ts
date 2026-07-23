import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { contactRequestsTable } from "@workspace/db/schema";
import { desc, eq } from "drizzle-orm";
import { adminAuth } from "../middleware/auth";

const router: IRouter = Router();

router.post("/requests", async (req, res) => {
  try {
    const { firstName, lastName, email, phone, interest, message } = req.body;

    if (!firstName || !lastName || !email || !message) {
      res.status(400).json({ error: "First name, last name, email, and message are required" });
      return;
    }

    const [request] = await db
      .insert(contactRequestsTable)
      .values({ firstName, lastName, email, phone: phone || null, interest: interest || null, message })
      .returning();

    res.status(201).json({
      success: true,
      id: request.id,
    });
  } catch (err) {
    console.error("Request submission error:", err);
    res.status(500).json({ error: "Failed to submit request" });
  }
});

router.get("/requests", adminAuth, async (_req, res) => {
  try {
    const requests = await db
      .select()
      .from(contactRequestsTable)
      .orderBy(desc(contactRequestsTable.createdAt));
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch requests" });
  }
});

router.put("/requests/:id", adminAuth, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const { firstName, lastName, email, phone, interest, message, status } = req.body;
    const updates: Record<string, unknown> = {};
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone || null;
    if (interest !== undefined) updates.interest = interest || null;
    if (message !== undefined) updates.message = message;
    if (status !== undefined) updates.status = status;

    const [updated] = await db
      .update(contactRequestsTable)
      .set(updates)
      .where(eq(contactRequestsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Request not found" });
      return;
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update request" });
  }
});

router.delete("/requests/:id", adminAuth, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const [deleted] = await db
      .delete(contactRequestsTable)
      .where(eq(contactRequestsTable.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Request not found" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete request" });
  }
});

export default router;
