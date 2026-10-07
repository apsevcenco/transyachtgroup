import { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useLocation } from "wouter";

import {
  checkAuth,
  createPartnerContact,
  deletePartnerContact,
  fetchPartnerContacts,
  updatePartnerContact,
  type PartnerContact,
  type PartnerContactInput,
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

export default function AdminPartners() {
  const [, setLocation] = useLocation();
  const [authorized, setAuthorized] = useState(false);
  const [items, setItems] = useState<PartnerContact[]>([]);
  const [editing, setEditing] = useState<PartnerContact | null>(null);
  const [form, setForm] = useState<PartnerContactInput>(emptyForm);
  const [filters, setFilters] = useState({ q: "", city: "", category: "", status: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const cities = useMemo(() => Array.from(new Set(items.map((item) => item.city).filter(Boolean))).sort(), [items]);
  const categories = useMemo(() => Array.from(new Set(items.map((item) => item.category).filter(Boolean))).sort(), [items]);

  const load = async () => {
    const data = await fetchPartnerContacts({ ...filters, limit: 1000 });
    setItems(data);
  };

  useEffect(() => {
    checkAuth().then((ok) => {
      if (!ok) setLocation("/admin");
      else {
        setAuthorized(true);
        void load();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setLocation]);

  const set = <K extends keyof PartnerContactInput>(key: K, value: PartnerContactInput[K]) => setForm((current) => ({ ...current, [key]: value }));

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
      setMessage("Partner contact deleted.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  if (!authorized) return <div className="min-h-screen bg-background p-10 text-white">Checking access…</div>;

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

        <section className="mt-8 rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="font-serif text-2xl">{editing ? "Edit partner contact" : "Add partner contact"}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="text-xs text-white/55">City<input value={form.city} onChange={(e) => set("city", e.target.value)} className="mt-2 w-full rounded border border-white/10 bg-black/40 p-3 text-white" /></label>
            <label className="text-xs text-white/55">Category<select value={form.category} onChange={(e) => set("category", e.target.value)} className="mt-2 w-full rounded border border-white/10 bg-black/40 p-3 text-white">{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="text-xs text-white/55">Status<select value={form.status} onChange={(e) => set("status", e.target.value)} className="mt-2 w-full rounded border border-white/10 bg-black/40 p-3 text-white">{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
            <label className="text-xs text-white/55 md:col-span-2">Organization<input value={form.organization} onChange={(e) => set("organization", e.target.value)} className="mt-2 w-full rounded border border-white/10 bg-black/40 p-3 text-white" /></label>
            <label className="text-xs text-white/55">Contact / role<input value={form.contactPerson || ""} onChange={(e) => set("contactPerson", e.target.value)} className="mt-2 w-full rounded border border-white/10 bg-black/40 p-3 text-white" /></label>
            <label className="text-xs text-white/55">Email<input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="mt-2 w-full rounded border border-white/10 bg-black/40 p-3 text-white" /></label>
            <label className="text-xs text-white/55">Phone<input value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} className="mt-2 w-full rounded border border-white/10 bg-black/40 p-3 text-white" /></label>
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
          <div className="grid gap-3 md:grid-cols-5">
            <input value={filters.q} onChange={(e) => setFilters((v) => ({ ...v, q: e.target.value }))} placeholder="Search organization, email, phone" className="rounded border border-white/10 bg-black/40 p-3 text-sm text-white md:col-span-2" />
            <select value={filters.city} onChange={(e) => setFilters((v) => ({ ...v, city: e.target.value }))} className="rounded border border-white/10 bg-black/40 p-3 text-sm text-white"><option value="">All cities</option>{cities.map((city) => <option key={city} value={city}>{city}</option>)}</select>
            <select value={filters.category} onChange={(e) => setFilters((v) => ({ ...v, category: e.target.value }))} className="rounded border border-white/10 bg-black/40 p-3 text-sm text-white"><option value="">All categories</option>{categories.map((category) => <option key={category} value={category}>{categoryLabels[category] || category}</option>)}</select>
            <button disabled={busy} onClick={load} className="rounded border border-gold/30 px-4 py-3 text-sm text-gold disabled:opacity-40">Apply filters</button>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-xl border border-white/10">
          <div className="grid grid-cols-12 bg-white/[0.04] px-4 py-3 text-[10px] uppercase tracking-[0.16em] text-white/35">
            <span className="col-span-3">Organization</span><span className="col-span-2">City</span><span className="col-span-2">Category</span><span className="col-span-2">Email</span><span className="col-span-2">Phone</span><span className="text-right">Actions</span>
          </div>
          {items.map((item) => (
            <div key={item.id} className="grid grid-cols-12 gap-2 border-t border-white/10 px-4 py-4 text-sm">
              <div className="col-span-3 min-w-0"><p className="truncate text-white/85">{item.organization}</p><p className="truncate text-xs text-white/35">{item.contactPerson || item.status}</p></div>
              <div className="col-span-2 text-white/55">{item.city}</div>
              <div className="col-span-2 text-white/55">{categoryLabels[item.category] || item.category}</div>
              <div className="col-span-2 min-w-0 truncate text-white/55">{item.email}</div>
              <div className="col-span-2 min-w-0 truncate text-white/55">{item.phone || "—"}</div>
              <div className="flex justify-end gap-2"><button onClick={() => edit(item)} className="rounded border border-white/10 p-2 text-white/60 hover:text-gold"><Pencil size={15} /></button><button onClick={() => remove(item.id)} className="rounded border border-white/10 p-2 text-red-400/60 hover:text-red-400"><Trash2 size={15} /></button></div>
            </div>
          ))}
          {!items.length && <p className="border-t border-white/10 px-4 py-10 text-center text-sm text-white/35">No partner contacts yet. Run the import migration or add a contact manually.</p>}
        </section>
      </div>
    </div>
  );
}
