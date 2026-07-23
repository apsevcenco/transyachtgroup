-- Adds the agents table (agent contact directory) and vehicles.agent_id,
-- linking an "agent" ownership vehicle to the agent who supplies it.
-- ON DELETE SET NULL — deleting an agent shouldn't delete the vehicles
-- linked to them, just clear the link.

CREATE TABLE IF NOT EXISTS "agents" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"phone" text,
	"email" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "agent_id" integer;
--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;
