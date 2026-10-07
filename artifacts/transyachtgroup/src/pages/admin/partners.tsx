import { useEffect, useMemo, useState } from "react";
import { MessageSquare, Pencil, Trash2 } from "lucide-react";
import { useLocation } from "wouter";

import PartnerImport from "@/components/admin/PartnerImport";
import {
  assistPartnerContact,
  checkAuth,
  createPartnerContact,
  deletePartnerContact,
  fetchPartnerContacts,
  fetchPartnerMessages,
  fetchPartnerSummary,
  fetchUnmatchedPartnerMessages,
  markPartnerMessageRead,
  markPartnerMessagesRead,
  sendPartnerMessage,
  updatePartnerContact,
  type PartnerAssistDraft,
  type PartnerContact,
  type PartnerContactInput,
  type PartnerIntent,
  type PartnerMessage,
  type PartnerSummary,
} from "@/lib/api";

const emptyForm: PartnerContactInput = {
  city: "",
  category: "hotel",
  organization: "",
  email: "",
  phone: "",
  contactPerson: "",
  notes: "",
  sourceStatus: "",
  sourceCheckedAt: null,
  sourceUrl: "",
  status: "new",
  lastContactedAt: null,
  nextFollowUpAt: null,
  tags: [],
};

const categoryLabels: Record<string, string> = {
  hotel: "Hotels",
  concierge: "Concierge services",
  travel_agency: "Travel agencies",
  luxury_rental: "Luxury rentals",
};

const statuses = ["new", "proposal_sent", "replied", "interested", "not_interested", "partner", "do_not_contact"];
// Nothing left to chase for these, so an old follow-up date is not "overdue".
const closedStatuses = ["not_interested", "partner", "do_not_contact"];

const statusStyles: Record<string, string> = {
  new: "bg-white/5 text-white/50",
  proposal_sent: "bg-sky-500/10 text-sky-300",
  replied: "bg-gold/15 text-gold",
  interested: "bg-emerald-500/10 text-emerald-300",
  partner: "bg-emerald-500/20 text-emerald-200",
  not_interested: "bg-white/5 text-white/30",
  do_not_contact: "bg-red-500/10 text-red-300",
};

const messageStatusStyles: Record<string, string> = {
  delivered: "bg-emerald-500/10 text-emerald-300",
  delayed: "bg-amber-500/10 text-amber-300",
  bounced: "bg-red-500/10 text-red-300",
  complained: "bg-red-500/10 text-red-300",
  failed: "bg-red-500/10 text-red-300",
};

type View = "all" | "due" | "unread";

const label = (value: string) => value.replace(/_/g, " ");
const dateOnly = (iso?: string | null) => (iso ? iso.slice(0, 10) : "");
const toIso = (date: string) => (date ? `${date}T09:00:00.000Z` : null);
const formatDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString() : "—");
const inDays = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const isOverdue = (item: PartnerContact) =>
  Boolean(item.nextFollowUpAt) && new Date(item.nextFollowUpAt as string).getTime() <= Date.now() && !closedStatuses.includes(item.status);

const intentLabels: Record<PartnerIntent, string> = {
  interested: "Interested",
  question: "Has a question",
  not_interested: "Not interested",
  unsubscribe: "Wants to unsubscribe",
  out_of_office: "Out of office",
  other: "Other",
  no_reply: "No reply yet",
};

// Drafts a reply or follow-up from the thread, shows what the partner said,
// and lets the owner edit and send it. Nothing is sent without pressing Send.
function AssistPanel({
  contact,
  hasReply,
  onSent,
  onStatus,
}: {
  contact: PartnerContact;
  hasReply: boolean;
  onSent: () => Promise<void>;
  onStatus: (status: string) => Promise<void>;
}) {
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState<"reply" | "follow_up" | null>(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<PartnerAssistDraft | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const blocked = contact.status === "do_not_contact";

  const generate = async (mode: "reply" | "follow_up") => {
    setLoading(mode);
    setError("");
    try {
      const result = await assistPartnerContact(contact.id, { mode, instructions });
      setDraft(result);
      setSubject(result.subject);
      setBody(result.body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI assistant failed");
    } finally {
      setLoading(null);
    }
  };

  const send = async () => {
    if (!window.confirm(`Send this message to ${contact.email}?`)) return;
    setSending(true);
    setError("");
    try {
      await sendPartnerMessage(contact.id, { subject, body });
      setDraft(null);
      setInstructions("");
      await onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4 text-xs">
      <p className="text-[10px] uppercase tracking-[0.2em] text-gold/70">AI assistant</p>
      <input
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        placeholder="Optional guidance, e.g. propose a call next week"
        className="mt-3 w-full rounded border border-white/10 bg-black/40 p-3 text-white"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button disabled={loading !== null || !hasReply} onClick={() => void generate("reply")} title={hasReply ? "" : "No reply from this contact yet"} className="rounded border border-gold/30 px-4 py-2 text-gold disabled:opacity-40">{loading === "reply" ? "Writing…" : "Draft reply"}</button>
        <button disabled={loading !== null} onClick={() => void generate("follow_up")} className="rounded border border-white/15 px-4 py-2 text-white/70 hover:text-gold disabled:opacity-40">{loading === "follow_up" ? "Writing…" : "Draft follow-up"}</button>
      </div>
      {error && <p className="mt-3 text-red-300">{error}</p>}
      {draft && (
        <div className="mt-4 space-y-3">
          <div className="rounded border border-white/10 bg-black/30 p-3">
            <p className="text-white/80"><span className="mr-2 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-gold">{intentLabels[draft.intent]}</span>{draft.summary}</p>
            {draft.suggestedStatus !== contact.status && (
              <p className="mt-2 text-white/50">
                Suggested status: <span className="text-white/80">{label(draft.suggestedStatus)}</span>
                <button onClick={() => void onStatus(draft.suggestedStatus)} className="ml-3 rounded border border-white/15 px-3 py-1 text-white/70 hover:text-gold">Apply</button>
              </p>
            )}
          </div>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded border border-white/10 bg-black/40 p-3 text-white" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} className="w-full rounded border border-white/10 bg-black/40 p-3 text-white" />
          {blocked && <p className="text-red-300">This contact is marked do_not_contact — sending is disabled.</p>}
          <div className="flex gap-2">
            <button disabled={sending || blocked || !subject.trim() || !body.trim()} onClick={() => void send()} className="rounded bg-gold px-5 py-2.5 font-medium text-black disabled:opacity-40">{sending ? "Sending…" : `Send to ${contact.email}`}</button>
            <button disabled={sending} onClick={() => setDraft(null)} className="rounded border border-white/10 px-5 py-2.5 text-white/60">Discard</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPartners() {
  const [, setLocation] = useLocation();
  const [authorized, setAuthorized] = useState(false);
  const [items, setItems] = useState<PartnerContact[]>([]);
  const [editing, setEditing] = useState<PartnerContact | null>(null);
  const [form, setForm] = useState<PartnerContactInput>(emptyForm);
  const [filters, setFilters] = useState({ q: "", city: "", category: "", status: "" });
  const [view, setView] = useState<View>("all");
  const [summary, setSummary] = useState<PartnerSummary | null>(null);
  const [unmatched, setUnmatched] = useState<PartnerMessage[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [threads, setThreads] = useState<Record<number, PartnerMessage[]>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const cities = useMemo(() => Array.from(new Set(items.map((item) => item.city).filter(Boolean))).sort(), [items]);
  const categories = useMemo(() => Array.from(new Set(items.map((item) => item.category).filter(Boolean))).sort(), [items]);

  const load = async (overrides?: { view?: View; status?: string }) => {
    const nextView = overrides?.view ?? view;
    const data = await fetchPartnerContacts({
      ...filters,
      status: overrides?.status ?? filters.status,
      view: nextView === "all" ? undefined : nextView,
      limit: 1000,
    });
    setItems(data);
  };

  const loadMeta = async () => {
    try {
      const [nextSummary, nextUnmatched] = await Promise.all([fetchPartnerSummary(), fetchUnmatchedPartnerMessages()]);
      setSummary(nextSummary);
      setUnmatched(nextUnmatched.filter((entry) => !entry.readAt));
    } catch {
      // Counters are a convenience; the contact list must work without them.
    }
  };

  useEffect(() => {
    checkAuth().then((ok) => {
      if (!ok) setLocation("/admin");
      else {
        setAuthorized(true);
        void load();
        void loadMeta();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setLocation]);

  const set = <K extends keyof PartnerContactInput>(key: K, value: PartnerContactInput[K]) => setForm((current) => ({ ...current, [key]: value }));

  const selectView = (next: View) => {
    setView(next);
    void load({ view: next });
  };

  const edit = (item: PartnerContact) => {
    setEditing(item);
    setForm({
      city: item.city,
      category: item.category,
      organization: item.organization,
      email: item.email,
      phone: item.phone || "",
      contactPerson: item.contactPerson || "",
      notes: item.notes || "",
      sourceStatus: item.sourceStatus || "",
      sourceCheckedAt: item.sourceCheckedAt || null,
      sourceUrl: item.sourceUrl || "",
      status: item.status || "new",
      lastContactedAt: item.lastContactedAt || null,
      nextFollowUpAt: item.nextFollowUpAt || null,
      tags: item.tags || [],
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async () => {
    setBusy(true);
    try {
      if (editing) await updatePartnerContact(editing.id, form);
      else await createPartnerContact(form);
      setMessage(editing ? "Partner contact updated." : "Partner contact created.");
      setEditing(null);
      setForm(emptyForm);
      await load();
      void loadMeta();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm("Delete this partner contact?")) return;
    setBusy(true);
    try {
      await deletePartnerContact(id);
      await load();
      void loadMeta();
      setMessage("Partner contact deleted.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  const toggleThread = async (item: PartnerContact) => {
    if (openId === item.id) {
      setOpenId(null);
      return;
    }
    setOpenId(item.id);
    try {
      const history = await fetchPartnerMessages(item.id);
      setThreads((current) => ({ ...current, [item.id]: history }));
      if (item.unreadCount) {
        await markPartnerMessagesRead(item.id);
        setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, unreadCount: 0 } : entry)));
        void loadMeta();
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to load message history");
    }
  };

  const dismissUnmatched = async (id: number) => {
    try {
      await markPartnerMessageRead(id);
      setUnmatched((current) => current.filter((entry) => entry.id !== id));
      void loadMeta();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to update message");
    }
  };

  if (!authorized) return <div className="min-h-screen bg-background p-10 text-white">Checking access…</div>;

  const viewButton = (key: View, text: string, count?: number) => (
    <button
      key={key}
      onClick={() => selectView(key)}
      className={`rounded-full border px-4 py-2 text-xs transition ${view === key ? "border-gold/40 bg-gold/10 text-gold" : "border-white/10 text-white/50 hover:text-white/80"}`}
    >
      {text}
      {count ? <span className="ml-2 rounded-full bg-gold px-1.5 py-0.5 text-[10px] font-medium text-black">{count}</span> : null}
    </button>
  );

  return (
    <div className="min-h-screen bg-background p-5 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        <button onClick={() => setLocation("/admin/dashboard")} className="mb-6 text-sm text-white/45 hover:text-gold">← Admin dashboard</button>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gold/70">B2B outreach</p>
            <h1 className="mt-3 font-serif text-4xl">Partner CRM</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">Hotels, concierge services, agencies and luxury rental partners by city. This is separate from rental customers.</p>
          </div>
          {message && <p className="max-w-md rounded border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-white/55">{message}</p>}
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          {viewButton("all", "All contacts")}
          {viewButton("due", "Follow-ups due", summary?.dueFollowUps)}
          {viewButton("unread", "Unread replies", summary?.unreadReplies)}
        </div>

        {unmatched.length > 0 && (
          <section className="mt-6 rounded-xl border border-gold/25 bg-gold/[0.04] p-5">
            <h2 className="font-serif text-xl">Replies from unknown senders</h2>
            <p className="mt-1 text-xs text-white/45">These addresses are not in the CRM — a partner may have answered from a different mailbox.</p>
            <div className="mt-4 space-y-3">
              {unmatched.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-white/10 bg-black/30 p-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-white/80">{entry.email} · {entry.subject || "(no subject)"}</span>
                    <span className="text-white/35">{new Date(entry.createdAt).toLocaleString()}</span>
                  </div>
                  {entry.bodyText && <p className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap text-white/60">{entry.bodyText}</p>}
                  <button onClick={() => dismissUnmatched(entry.id)} className="mt-3 rounded border border-white/10 px-3 py-1.5 text-white/60 hover:text-gold">Mark as read</button>
                </div>
              ))}
            </div>
          </section>
        )}

        <PartnerImport
          onImported={async () => {
            await load();
            void loadMeta();
          }}
        />

        <section className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="font-serif text-2xl">{editing ? "Edit partner contact" : "Add partner contact"}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="text-xs text-white/55">City<input value={form.city} onChange={(e) => set("city", e.target.value)} className="mt-2 w-full rounded border border-white/10 bg-black/40 p-3 text-white" /></label>
            <label className="text-xs text-white/55">Category<select value={form.category} onChange={(e) => set("category", e.target.value)} className="mt-2 w-full rounded border border-white/10 bg-black/40 p-3 text-white">{Object.entries(categoryLabels).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
            <label className="text-xs text-white/55">Status<select value={form.status} onChange={(e) => set("status", e.target.value)} className="mt-2 w-full rounded border border-white/10 bg-black/40 p-3 text-white">{statuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></label>
            <label className="text-xs text-white/55 md:col-span-2">Organization<input value={form.organization} onChange={(e) => set("organization", e.target.value)} className="mt-2 w-full rounded border border-white/10 bg-black/40 p-3 text-white" /></label>
            <label className="text-xs text-white/55">Contact / role<input value={form.contactPerson || ""} onChange={(e) => set("contactPerson", e.target.value)} className="mt-2 w-full rounded border border-white/10 bg-black/40 p-3 text-white" /></label>
            <label className="text-xs text-white/55">Email<input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="mt-2 w-full rounded border border-white/10 bg-black/40 p-3 text-white" /></label>
            <label className="text-xs text-white/55">Phone<input value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} className="mt-2 w-full rounded border border-white/10 bg-black/40 p-3 text-white" /></label>
            <label className="text-xs text-white/55">Last contacted<input type="date" value={dateOnly(form.lastContactedAt)} onChange={(e) => set("lastContactedAt", toIso(e.target.value))} className="mt-2 w-full rounded border border-white/10 bg-black/40 p-3 text-white" /></label>
            <div className="text-xs text-white/55 md:col-span-2">
              <label className="block">Next follow-up<input type="date" value={dateOnly(form.nextFollowUpAt)} onChange={(e) => set("nextFollowUpAt", toIso(e.target.value))} className="mt-2 w-full rounded border border-white/10 bg-black/40 p-3 text-white md:max-w-xs" /></label>
              <div className="mt-2 flex flex-wrap gap-2">
                {[3, 7, 14].map((days) => (
                  <button key={days} type="button" onClick={() => set("nextFollowUpAt", toIso(inDays(days)))} className="rounded border border-white/10 px-3 py-1.5 text-white/55 hover:text-gold">+{days} days</button>
                ))}
                <button type="button" onClick={() => set("nextFollowUpAt", null)} className="rounded border border-white/10 px-3 py-1.5 text-white/40 hover:text-gold">Clear</button>
              </div>
            </div>
            <label className="text-xs text-white/55">Source checked<input type="date" value={form.sourceCheckedAt || ""} onChange={(e) => set("sourceCheckedAt", e.target.value || null)} className="mt-2 w-full rounded border border-white/10 bg-black/40 p-3 text-white" /></label>
            <label className="text-xs text-white/55 md:col-span-2">Source URL<input value={form.sourceUrl || ""} onChange={(e) => set("sourceUrl", e.target.value)} className="mt-2 w-full rounded border border-white/10 bg-black/40 p-3 text-white" /></label>
            <label className="text-xs text-white/55">Source status<input value={form.sourceStatus || ""} onChange={(e) => set("sourceStatus", e.target.value)} className="mt-2 w-full rounded border border-white/10 bg-black/40 p-3 text-white" /></label>
            <label className="text-xs text-white/55 md:col-span-3">Notes<textarea value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} rows={3} className="mt-2 w-full rounded border border-white/10 bg-black/40 p-3 text-white" /></label>
          </div>
          <div className="mt-5 flex gap-3">
            <button disabled={busy || !form.city || !form.category || !form.organization || !form.email} onClick={save} className="rounded bg-gold px-6 py-3 text-sm font-medium text-black disabled:opacity-40">{busy ? "Working…" : editing ? "Save changes" : "Create contact"}</button>
            {editing && <button onClick={() => { setEditing(null); setForm(emptyForm); }} className="rounded border border-white/10 px-6 py-3 text-sm text-white/60">Cancel</button>}
          </div>
        </section>

        <section className="mt-8 rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <div className="grid gap-3 md:grid-cols-6">
            <input value={filters.q} onChange={(e) => setFilters((v) => ({ ...v, q: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") void load(); }} placeholder="Search organization, email, phone" className="rounded border border-white/10 bg-black/40 p-3 text-sm text-white md:col-span-2" />
            <select value={filters.city} onChange={(e) => setFilters((v) => ({ ...v, city: e.target.value }))} className="rounded border border-white/10 bg-black/40 p-3 text-sm text-white"><option value="">All cities</option>{cities.map((city) => <option key={city} value={city}>{city}</option>)}</select>
            <select value={filters.category} onChange={(e) => setFilters((v) => ({ ...v, category: e.target.value }))} className="rounded border border-white/10 bg-black/40 p-3 text-sm text-white"><option value="">All categories</option>{categories.map((category) => <option key={category} value={category}>{categoryLabels[category] || category}</option>)}</select>
            <select value={filters.status} onChange={(e) => { setFilters((v) => ({ ...v, status: e.target.value })); void load({ status: e.target.value }); }} className="rounded border border-white/10 bg-black/40 p-3 text-sm text-white"><option value="">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select>
            <button disabled={busy} onClick={() => void load()} className="rounded border border-gold/30 px-4 py-3 text-sm text-gold disabled:opacity-40">Apply filters</button>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-xl border border-white/10">
          <div className="hidden grid-cols-12 bg-white/[0.04] px-4 py-3 text-[10px] uppercase tracking-[0.16em] text-white/35 md:grid">
            <span className="col-span-3">Organization</span><span className="col-span-2">City</span><span className="col-span-2">Contact</span><span className="col-span-2">Status</span><span className="col-span-2">Follow-up</span><span className="text-right">Actions</span>
          </div>
          {items.map((item) => (
            <div key={item.id} className="border-t border-white/10">
              <div className={`grid grid-cols-1 gap-2 px-4 py-4 text-sm md:grid-cols-12 ${item.unreadCount ? "border-l-2 border-l-gold bg-gold/[0.03]" : ""}`}>
                <div className="min-w-0 md:col-span-3"><p className="truncate text-white/85">{item.organization}</p><p className="truncate text-xs text-white/35">{item.contactPerson || "—"}</p></div>
                <div className="md:col-span-2"><p className="text-white/55">{item.city}</p><p className="text-xs text-white/30">{categoryLabels[item.category] || item.category}</p></div>
                <div className="min-w-0 md:col-span-2"><p className="truncate text-white/55">{item.email}</p><p className="truncate text-xs text-white/30">{item.phone || "—"}</p></div>
                <div className="md:col-span-2">
                  <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wider ${statusStyles[item.status] || "bg-white/5 text-white/50"}`}>{label(item.status)}</span>
                  {item.unreadCount ? <span className="ml-2 rounded-full bg-gold px-2 py-0.5 text-[10px] font-medium text-black">{item.unreadCount} new</span> : null}
                </div>
                <div className="text-xs md:col-span-2">
                  <p className={isOverdue(item) ? "text-red-300" : "text-white/55"}>Next: {formatDate(item.nextFollowUpAt)}{isOverdue(item) ? " · overdue" : ""}</p>
                  <p className="text-white/30">Last: {formatDate(item.lastContactedAt)}</p>
                </div>
                <div className="flex flex-wrap justify-start gap-1.5 md:justify-end">
                  <button onClick={() => void toggleThread(item)} title="Email history" className={`rounded border p-1.5 ${openId === item.id ? "border-gold/40 text-gold" : "border-white/10 text-white/60 hover:text-gold"}`}><MessageSquare size={15} /></button>
                  <button onClick={() => edit(item)} title="Edit" className="rounded border border-white/10 p-1.5 text-white/60 hover:text-gold"><Pencil size={15} /></button>
                  <button onClick={() => remove(item.id)} title="Delete" className="rounded border border-white/10 p-1.5 text-red-400/60 hover:text-red-400"><Trash2 size={15} /></button>
                </div>
              </div>
              {openId === item.id && (
                <div className="space-y-3 border-t border-white/10 bg-black/20 px-4 py-4">
                  {threads[item.id] === undefined ? (
                    <p className="text-xs text-white/35">Loading…</p>
                  ) : threads[item.id].length === 0 ? (
                    <p className="text-xs text-white/35">No emails exchanged with this contact yet.</p>
                  ) : (
                    threads[item.id].map((entry) => (
                      <div key={entry.id} className={`rounded-lg border p-3 text-xs ${entry.direction === "inbound" ? "border-gold/25 bg-gold/[0.04]" : "border-white/10 bg-white/[0.02]"}`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-white/80">{entry.direction === "inbound" ? "← Reply" : "→ Sent"} · {entry.subject || "(no subject)"}</span>
                          <span className="text-white/35">{new Date(entry.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${messageStatusStyles[entry.status] || "bg-white/5 text-white/50"}`}>{entry.status}</span>
                          {entry.hasAttachment && <span className="text-white/35">PDF attached</span>}
                          {entry.error && <span className="text-red-300">{entry.error}</span>}
                        </div>
                        {entry.bodyText && <p className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-white/70">{entry.bodyText}</p>}
                      </div>
                    ))
                  )}
                  {threads[item.id] !== undefined && (
                    <AssistPanel
                      key={item.id}
                      contact={item}
                      hasReply={threads[item.id].some((entry) => entry.direction === "inbound")}
                      onSent={async () => {
                        const history = await fetchPartnerMessages(item.id);
                        setThreads((current) => ({ ...current, [item.id]: history }));
                        await load();
                        void loadMeta();
                        setMessage("Message sent.");
                      }}
                      onStatus={async (status) => {
                        await updatePartnerContact(item.id, { status });
                        await load();
                        void loadMeta();
                        setMessage(`Status set to ${label(status)}.`);
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          ))}
          {!items.length && <p className="border-t border-white/10 px-4 py-10 text-center text-sm text-white/35">{view === "all" && !filters.q && !filters.city && !filters.category && !filters.status ? "No partner contacts yet. Run the import migration or add a contact manually." : "Nothing matches the current view or filters."}</p>}
        </section>
      </div>
    </div>
  );
}
