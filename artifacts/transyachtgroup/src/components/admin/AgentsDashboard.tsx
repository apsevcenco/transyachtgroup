import { useState, useEffect, useCallback } from "react";
import { Loader2, X, Trash2, Plus } from "lucide-react";
import { fetchAgents, createAgent, updateAgent, deleteAgent, type Agent } from "@/lib/api";

export function AgentsDashboard() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Agent | "new" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setAgents(await fetchAgents());
    } catch (err: any) {
      setError(err.message || "Failed to load agents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this agent? Vehicles linked to them will keep their data but lose the agent link.")) return;
    try {
      await deleteAgent(id);
      await load();
    } catch (err: any) {
      setError(err.message || "Failed to delete agent");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-white/40 text-sm">{agents.length} agent{agents.length === 1 ? "" : "s"}</p>
        <button
          onClick={() => setEditing("new")}
          className="min-h-[44px] flex items-center gap-1.5 bg-[hsl(43,67%,55%)] text-black text-xs uppercase tracking-wide px-4 rounded-md hover:bg-[hsl(43,67%,65%)] transition-colors"
        >
          <Plus size={14} /> Add Agent
        </button>
      </div>

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-white/40">
          <Loader2 size={20} className="animate-spin mr-2" /> Loading agents…
        </div>
      ) : agents.length === 0 ? (
        <p className="text-white/40 text-sm py-10 text-center">No agents yet.</p>
      ) : (
        <div className="space-y-2">
          {agents.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-3 p-3.5 rounded-lg border border-white/[0.08] bg-white/[0.02]"
            >
              <div className="min-w-0">
                <p className="text-sm text-white truncate">{a.name}</p>
                <p className="text-[11px] text-white/40 truncate">
                  {[a.phone, a.email, a.address].filter(Boolean).join(" · ") || "No contact details"}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => setEditing(a)}
                  className="text-[11px] uppercase tracking-wide text-white/50 hover:text-gold transition-colors min-h-[44px] px-2"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="text-red-400/60 hover:text-red-400 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Delete agent"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <AgentFormModal
          agent={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function AgentFormModal({
  agent,
  onClose,
  onSaved,
}: {
  agent: Agent | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(agent?.name || "");
  const [phone, setPhone] = useState(agent?.phone || "");
  const [email, setEmail] = useState(agent?.email || "");
  const [address, setAddress] = useState(agent?.address || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const inputClass =
    "w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-gold/40";
  const labelClass = "block text-[10px] uppercase tracking-wide text-white/40 mb-1";

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
      };
      if (agent) {
        await updateAgent(agent.id, payload);
      } else {
        await createAgent(payload);
      }
      onSaved();
    } catch (err: any) {
      setError(err.message || "Failed to save agent");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#0f0f0f] border border-white/[0.08] rounded-xl w-full max-w-sm p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors">
          <X size={18} />
        </button>

        <h3 className="font-porter text-white text-lg mb-5">{agent ? "Edit Agent" : "New Agent"}</h3>

        <div className="space-y-3.5">
          <div>
            <label className={labelClass}>Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Address</label>
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className={`${inputClass} resize-none`} />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-[hsl(43,67%,55%)] text-black text-xs uppercase tracking-wide px-5 py-2.5 rounded-md hover:bg-[hsl(43,67%,65%)] disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : agent ? "Save Changes" : "Create Agent"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
