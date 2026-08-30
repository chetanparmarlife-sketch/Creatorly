import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, Download, FileSpreadsheet, Upload, UserPlus, X } from "lucide-react";
import type { CreatorImportPreview, Platform, PrivateCreatorInput, SavedCreator } from "../../types";
import { importErrorsCsv, parseCreatorCsv } from "./creatorImport";
import { useWorkspaceData } from "./WorkspaceData";

type ImportMode = "csv" | "manual";

function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function existingIdentities(items: SavedCreator[]) {
  return items.map(item => ({ platform: item.creator.platform, handle: item.creator.handle, email: item.privateContact?.email }));
}

const emptyManual: PrivateCreatorInput = { displayName: "", platform: undefined, handle: "", email: "", phone: "", whatsapp: "", location: "", notes: "", tags: [] };

export function CreatorImportPanel({ workspaceId, existing, onClose, onImported }: { workspaceId: string; existing: SavedCreator[]; onClose(): void; onImported(): Promise<void> }) {
  const store = useWorkspaceData();
  const [mode, setMode] = useState<ImportMode>("csv");
  const [preview, setPreview] = useState<CreatorImportPreview | null>(null);
  const [fileName, setFileName] = useState("");
  const [manual, setManual] = useState<PrivateCreatorInput>(emptyManual);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const identities = useMemo(() => existingIdentities(existing), [existing]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);

  async function readFile(file?: File) {
    if (!file) return;
    setFileName(file.name); setError(""); setResult("");
    const text = await file.text();
    setPreview(parseCreatorCsv(text, identities));
  }

  async function importReady() {
    if (!preview?.readyCount) return;
    setSaving(true); setError("");
    try {
      const response = await store.importPrivateCreators(workspaceId, "csv_upload", preview.rows.filter(row => row.status === "ready").map(row => row.input));
      setResult(`${response.imported} creator${response.imported === 1 ? "" : "s"} imported privately.`);
      await onImported();
      onClose();
    } catch { setError("The import could not be saved. Check the file and try again."); }
    finally { setSaving(false); }
  }

  async function addManual(event: React.FormEvent) {
    event.preventDefault(); setError("");
    if (!manual.displayName.trim()) { setError("Creator name is required."); return; }
    if (!manual.handle?.trim() && !manual.email?.trim() && !manual.phone?.trim() && !manual.whatsapp?.trim()) { setError("Add a handle, email, phone, or WhatsApp number."); return; }
    setSaving(true);
    try {
      const response = await store.importPrivateCreators(workspaceId, "manual", [{ ...manual, tags: manual.tags?.filter(Boolean) }]);
      if (response.duplicates) { setError("This creator already exists in your workspace."); return; }
      if (!response.imported) { setError("This creator could not be added. Check the details and try again."); return; }
      await onImported();
      onClose();
    } catch { setError("This creator could not be saved. Try again."); }
    finally { setSaving(false); }
  }

  return <div className="creator-import-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="creator-import-modal" role="dialog" aria-modal="true" aria-labelledby="creator-import-title">
      <header><div><p className="eyebrow">Private creator data</p><h2 id="creator-import-title">Add creators to your CRM</h2><p>Only members of this workspace can access uploaded profiles and contacts.</p></div><button className="icon-button" aria-label="Close creator import" onClick={onClose}><X size={18}/></button></header>
      <nav className="creator-import-tabs" aria-label="Creator import method"><button className={mode === "csv" ? "is-active" : ""} onClick={() => { setMode("csv"); setError(""); }}><FileSpreadsheet size={15}/> Upload CSV</button><button className={mode === "manual" ? "is-active" : ""} onClick={() => { setMode("manual"); setError(""); }}><UserPlus size={15}/> Add manually</button></nav>

      {mode === "csv" ? <div className="creator-import-body">
        <label className="csv-file-control"><Upload size={20}/><span><strong>{fileName || "Choose a creator CSV"}</strong><small>Name, platform, handle, followers, contact, tags, and notes are supported.</small></span><input aria-label="CSV file" type="file" accept=".csv,text/csv" onChange={event => void readFile(event.target.files?.[0])}/></label>
        {preview ? <><div className="import-counts" aria-label="Import preview summary"><span className="is-ready"><Check size={14}/><strong>{preview.readyCount}</strong> ready</span><span className="is-duplicate"><FileSpreadsheet size={14}/><strong>{preview.duplicateCount}</strong> duplicate</span><span className="is-error"><AlertCircle size={14}/><strong>{preview.errorCount}</strong> error</span></div>
          <div className="import-preview"><div className="import-preview-head"><span>Row</span><span>Creator</span><span>Identity</span><span>Status</span></div>{preview.rows.slice(0, 50).map(row => <div className="import-preview-row" key={row.rowNumber}><code>{row.rowNumber}</code><span><strong>{row.input.displayName || "Missing name"}</strong><small>{row.input.email || row.input.location || "—"}</small></span><span>{row.input.platform ? `${row.input.platform === "twitter" ? "X" : row.input.platform} ${row.input.handle ?? ""}` : row.input.handle ?? "Contact only"}</span><span className={`import-status import-status-${row.status}`}>{row.status === "ready" ? "Ready" : row.status === "duplicate" ? "Duplicate" : row.errors[0]}</span></div>)}</div>
          <footer>{preview.duplicateCount || preview.errorCount ? <button className="button button-secondary" onClick={() => downloadText("creatorly-import-errors.csv", importErrorsCsv(preview.rows))}><Download size={15}/> Download error report</button> : <span/>}<button className="button button-primary" disabled={saving || !preview.readyCount} onClick={() => void importReady()}>{saving ? "Importing…" : `Import ${preview.readyCount} ready`}</button></footer></> : <div className="csv-guidance"><strong>CSV headers</strong><code>name, platform, handle, followers, location, email, phone, whatsapp, tags, notes</code><p>Rows are checked before anything is saved. Duplicates and invalid rows remain out of the CRM.</p></div>}
      </div> : <form className="creator-manual-form" onSubmit={addManual}>
        <div className="manual-form-grid"><label>Creator name<input autoFocus required value={manual.displayName} onChange={event => setManual(current => ({ ...current, displayName: event.target.value }))}/></label><label>Platform <small>Optional</small><select value={manual.platform ?? ""} onChange={event => setManual(current => ({ ...current, platform: event.target.value ? event.target.value as Platform : undefined }))}><option value="">Choose platform</option><option value="instagram">Instagram</option><option value="tiktok">TikTok</option><option value="youtube">YouTube</option><option value="twitter">X</option></select></label><label>Handle<input value={manual.handle} onChange={event => setManual(current => ({ ...current, handle: event.target.value }))} placeholder="@creator"/></label><label>Followers <small>Optional</small><input min="0" type="number" value={manual.followerCount ?? ""} onChange={event => setManual(current => ({ ...current, followerCount: event.target.value ? Number(event.target.value) : undefined }))}/></label><label>Location <small>Optional</small><input value={manual.location} onChange={event => setManual(current => ({ ...current, location: event.target.value }))}/></label><label>Email <small>Private</small><input type="email" value={manual.email} onChange={event => setManual(current => ({ ...current, email: event.target.value }))}/></label><label>Phone <small>Private</small><input value={manual.phone} onChange={event => setManual(current => ({ ...current, phone: event.target.value }))}/></label><label>WhatsApp <small>Private</small><input value={manual.whatsapp} onChange={event => setManual(current => ({ ...current, whatsapp: event.target.value }))}/></label></div><label>Notes <small>Private</small><textarea value={manual.notes} onChange={event => setManual(current => ({ ...current, notes: event.target.value }))} placeholder="Relationship context, preferences, or internal notes"/></label><label>Tags <small>Separate with commas</small><input value={manual.tags?.join(", ")} onChange={event => setManual(current => ({ ...current, tags: event.target.value.split(",").map(tag => tag.trim()) }))}/></label><footer><span/><button className="button button-primary" disabled={saving}>{saving ? "Saving…" : "Add private creator"}</button></footer>
      </form>}
      {error ? <p className="creator-import-error" role="alert">{error}</p> : null}{result ? <p className="creator-import-success" role="status">{result}</p> : null}
    </section>
  </div>;
}
