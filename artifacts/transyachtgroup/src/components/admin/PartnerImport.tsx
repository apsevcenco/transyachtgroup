import { useState } from "react";

import { importPartnerContacts, type PartnerImportResult } from "@/lib/api";
import {
  buildRows,
  cellText,
  DEFAULT_LAYOUT,
  findHeaderRow,
  guessCategory,
  guessColumns,
  IMPORT_CATEGORIES,
  IMPORT_FIELDS,
  parseCsv,
  rowKey,
  type ColumnMap,
  type Grid,
  type ImportField,
  type ImportRowInput,
} from "@/lib/partnerImportParse";

type SheetState = {
  name: string;
  grid: Grid;
  headerRow: number;
  map: ColumnMap;
  category: string;
  include: boolean;
};

type Preview = {
  rows: ImportRowInput[];
  skippedNoEmail: number;
  duplicatesInFile: number;
  result: PartnerImportResult;
  problems: string[];
};

// Stays well under the server's per-request cap and body limit.
const CHUNK = 150;

const fieldLabels: Record<ImportField, string> = {
  city: "City",
  organization: "Organization",
  email: "Email",
  phone: "Phone",
  contactPerson: "Contact / role",
  notes: "Notes",
  sourceStatus: "Source status",
  sourceCheckedAt: "Source checked",
  sourceUrl: "Source URL",
  category: "Category column",
};

const columnName = (index: number) => {
  let n = index;
  let name = "";
  do {
    name = String.fromCharCode(65 + (n % 26)) + name;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return name;
};

const toPayload = (rows: ImportRowInput[]) => rows.map((row) => ({ ...row }));

function chunked<T>(items: T[], size: number): T[][] {
  const parts: T[][] = [];
  for (let i = 0; i < items.length; i += size) parts.push(items.slice(i, i + size));
  return parts;
}

function sheetFromGrid(name: string, grid: Grid): SheetState {
  const headerRow = findHeaderRow(grid);
  const map = headerRow >= 0 ? guessColumns(grid[headerRow] || []) : { ...DEFAULT_LAYOUT };
  const hasEmails = buildRows(grid, map, headerRow, "hotel").rows.length > 0;
  return { name, grid, headerRow, map, category: guessCategory(name) || "hotel", include: hasEmails };
}

export default function PartnerImport({ onImported }: { onImported: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [sheets, setSheets] = useState<SheetState[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [done, setDone] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setPreview(null);
    setDone("");
    setError("");
  };

  const readFile = async (file?: File) => {
    if (!file) return;
    reset();
    setSheets([]);
    setFileName(file.name);
    setBusy(true);
    try {
      if (/\.csv$/i.test(file.name)) {
        setSheets([sheetFromGrid(file.name, parseCsv(await file.text()))]);
      } else if (/\.xlsx$/i.test(file.name)) {
        // Loaded on demand: the Excel reader is only needed on this screen.
        const { default: readXlsxFile } = await import("read-excel-file/browser");
        const parsed = await readXlsxFile(file);
        setSheets(parsed.map((sheet) => sheetFromGrid(sheet.sheet, sheet.data as unknown as Grid)));
      } else {
        throw new Error("Choose an .xlsx or .csv file (save older .xls files as .xlsx first).");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read the file");
    } finally {
      setBusy(false);
    }
  };

  const updateSheet = (index: number, patch: Partial<SheetState>) => {
    setSheets((current) => current.map((sheet, i) => (i === index ? { ...sheet, ...patch } : sheet)));
    reset();
  };

  const collect = () => {
    const seen = new Set<string>();
    const rows: ImportRowInput[] = [];
    let skippedNoEmail = 0;
    let duplicatesInFile = 0;
    for (const sheet of sheets.filter((entry) => entry.include)) {
      const built = buildRows(sheet.grid, sheet.map, sheet.headerRow, sheet.category);
      skippedNoEmail += built.skippedNoEmail;
      for (const row of built.rows) {
        const key = rowKey(row);
        if (seen.has(key)) {
          duplicatesInFile += 1;
          continue;
        }
        seen.add(key);
        rows.push(row);
      }
    }
    return { rows, skippedNoEmail, duplicatesInFile };
  };

  const check = async () => {
    setBusy(true);
    setError("");
    setDone("");
    try {
      const collected = collect();
      const total: PartnerImportResult = { received: 0, valid: 0, invalid: [], invalidCount: 0, duplicatesInFile: 0, alreadyInCrm: 0, willImport: 0 };
      const problems: string[] = [];
      let offset = 0;
      for (const part of chunked(collected.rows, CHUNK)) {
        const result = await importPartnerContacts(toPayload(part), true);
        total.received += result.received;
        total.valid += result.valid;
        total.invalidCount += result.invalidCount;
        total.duplicatesInFile += result.duplicatesInFile;
        total.alreadyInCrm += result.alreadyInCrm;
        total.willImport = (total.willImport || 0) + (result.willImport || 0);
        for (const entry of result.invalid) {
          if (problems.length < 10) {
            const row = collected.rows[offset + entry.index];
            problems.push(`${row?.organization || row?.email || "row"}: ${entry.reason}`);
          }
        }
        offset += part.length;
      }
      setPreview({ ...collected, result: total, problems });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check failed");
    } finally {
      setBusy(false);
    }
  };

  const run = async () => {
    if (!preview) return;
    setBusy(true);
    setError("");
    try {
      let inserted = 0;
      for (const part of chunked(preview.rows, CHUNK)) {
        const result = await importPartnerContacts(toPayload(part), false);
        inserted += result.inserted || 0;
      }
      setDone(`Imported ${inserted} new contact${inserted === 1 ? "" : "s"}. Existing contacts were left untouched.`);
      setPreview(null);
      await onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };

  const columnOptions = (sheet: SheetState) => {
    const width = Math.max(0, ...sheet.grid.slice(0, 50).map((row) => row?.length || 0));
    const sampleRow = sheet.headerRow >= 0 ? sheet.grid[sheet.headerRow] : sheet.grid.find((row) => row?.some((cell) => cellText(cell))) || [];
    return Array.from({ length: width }, (_, index) => {
      const sample = cellText(sampleRow?.[index]).slice(0, 28);
      return { index, label: `${columnName(index)}${sample ? `: ${sample}` : ""}` };
    });
  };

  return (
    <section className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <button onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between text-left">
        <span className="font-serif text-2xl">Import contacts from Excel / CSV</span>
        <span className="text-xs text-white/40">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <div className="mt-4 text-xs">
          <p className="max-w-2xl leading-5 text-white/45">
            Pick a spreadsheet with city, organization and email columns. Each sheet becomes one category. Contacts already in the CRM are skipped, so it is safe to import the same file twice. Nothing is saved until you press Import.
          </p>
          <input type="file" accept=".xlsx,.csv" disabled={busy} onChange={(e) => { void readFile(e.target.files?.[0]); e.target.value = ""; }} className="mt-4 block text-white/60 file:mr-4 file:rounded file:border file:border-white/15 file:bg-black/40 file:px-4 file:py-2 file:text-white/70" />
          {fileName && <p className="mt-2 text-white/35">{fileName}</p>}

          {sheets.map((sheet, index) => {
            const options = columnOptions(sheet);
            const count = buildRows(sheet.grid, sheet.map, sheet.headerRow, sheet.category).rows.length;
            return (
              <div key={`${sheet.name}-${index}`} className="mt-4 rounded-lg border border-white/10 bg-black/20 p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-white/80"><input type="checkbox" checked={sheet.include} onChange={(e) => updateSheet(index, { include: e.target.checked })} />{sheet.name}</label>
                  <span className="text-white/35">{count} contact{count === 1 ? "" : "s"} found</span>
                  <select value={sheet.category} onChange={(e) => updateSheet(index, { category: e.target.value })} className="rounded border border-white/10 bg-black/40 p-2 text-white">
                    {IMPORT_CATEGORIES.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
                  </select>
                </div>
                {sheet.map.email < 0 && <p className="mt-2 text-amber-300">No email column detected — choose it under Columns.</p>}
                <details className="mt-3">
                  <summary className="cursor-pointer text-white/50 hover:text-gold">Columns</summary>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    {IMPORT_FIELDS.map((field) => (
                      <label key={field} className="text-white/45">{fieldLabels[field]}
                        <select value={sheet.map[field]} onChange={(e) => updateSheet(index, { map: { ...sheet.map, [field]: Number(e.target.value) } })} className="mt-1 w-full rounded border border-white/10 bg-black/40 p-2 text-white">
                          <option value={-1}>— not in file —</option>
                          {options.map((option) => <option key={option.index} value={option.index}>{option.label}</option>)}
                        </select>
                      </label>
                    ))}
                  </div>
                </details>
              </div>
            );
          })}

          {sheets.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button disabled={busy || !sheets.some((sheet) => sheet.include)} onClick={() => void check()} className="rounded border border-gold/30 px-5 py-2.5 text-gold disabled:opacity-40">{busy && !preview ? "Working…" : "Check file"}</button>
              {preview && preview.result.willImport! > 0 && (
                <button disabled={busy} onClick={() => void run()} className="rounded bg-gold px-5 py-2.5 font-medium text-black disabled:opacity-40">{busy ? "Importing…" : `Import ${preview.result.willImport} new contact${preview.result.willImport === 1 ? "" : "s"}`}</button>
              )}
            </div>
          )}

          {preview && (
            <div className="mt-4 rounded-lg border border-white/10 bg-black/30 p-4 text-white/70">
              <p><span className="text-emerald-300">{preview.result.willImport}</span> new · {preview.result.alreadyInCrm} already in the CRM · {preview.duplicatesInFile + preview.result.duplicatesInFile} duplicates in the file · {preview.skippedNoEmail} rows without an email · <span className={preview.result.invalidCount ? "text-red-300" : ""}>{preview.result.invalidCount} invalid</span></p>
              {preview.problems.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-red-300/80">{preview.problems.map((problem) => <li key={problem}>{problem}</li>)}</ul>
              )}
              {preview.result.willImport === 0 && <p className="mt-2 text-white/45">Nothing new to import.</p>}
            </div>
          )}
          {done && <p className="mt-4 text-emerald-300">{done}</p>}
          {error && <p className="mt-4 text-red-300">{error}</p>}
        </div>
      )}
    </section>
  );
}
