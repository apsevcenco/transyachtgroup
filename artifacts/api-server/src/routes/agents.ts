import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { agentsTable, insertAgentSchema } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { adminAuth } from "../middleware/auth";

const router: IRouter = Router();

router.use("/agents", adminAuth);

// GET /agents — list all agents
router.get("/agents", async (_req, res) => {
  try {
    const agents = await db.select().from(agentsTable).orderBy(agentsTable.name);
    res.json(agents);
  } catch (err) {
    console.error("Agents fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /agents/:id
router.get("/agents/:id", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const [agent] = await db.select().from(agentsTable).where(eq(agentsTable.id, id));
    if (!agent) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }
    res.json(agent);
  } catch (err) {
    console.error("Agent fetch error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /agents
router.post("/agents", async (req, res) => {
  try {
    const parsed = insertAgentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid data", details: parsed.error.issues });
      return;
    }
    const [agent] = await db.insert(agentsTable).values(parsed.data).returning();
    res.status(201).json(agent);
  } catch (err) {
    console.error("Agent create error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /agents/:id
router.put("/agents/:id", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const parsed = insertAgentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid data", details: parsed.error.issues });
      return;
    }
    const [agent] = await db.update(agentsTable).set(parsed.data).where(eq(agentsTable.id, id)).returning();
    if (!agent) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }
    res.json(agent);
  } catch (err) {
    console.error("Agent update error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /agents/:id
router.delete("/agents/:id", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const [deleted] = await db.delete(agentsTable).where(eq(agentsTable.id, id)).returning();
    if (!deleted) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Agent delete error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
