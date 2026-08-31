import { useState, type FormEvent } from "react";
import { CheckCircle2, Send, X } from "lucide-react";
import { useAppData } from "../data/AppData";
import type { Platform } from "../types";

export function RequestContactModal({
  initialHandle,
  initialPlatform,
  onClose,
}: {
  initialHandle: string;
  initialPlatform: Platform;
  onClose(): void;
}) {
  const data = useAppData();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<"created" | "already_pending" | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await data.requestContact({
        platform: String(form.get("platform")) as Platform,
        handle: String(form.get("handle") ?? ""),
        notes: String(form.get("notes") ?? ""),
      });
      setResult(response.status);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not submit this request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      className="request-dialog"
      open
      aria-labelledby="request-dialog-title"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="request-dialog-card">
        <button className="dialog-close" type="button" onClick={onClose} aria-label="Close request dialog"><X size={18} /></button>
        {result ? (
          <div className="request-success">
            <span><CheckCircle2 size={26} aria-hidden="true" /></span>
            <p className="eyebrow">Request queued</p>
            <h2 id="request-dialog-title">{result === "created" ? "Request received" : "Already on the list"}</h2>
            <p>We’ll email when this contact is added. Email delivery will begin once notifications are connected.</p>
            <button className="button button-primary" type="button" onClick={onClose}>Close</button>
          </div>
        ) : (
          <div className="request-form-wrap">
            <p className="eyebrow">Missing contact</p>
            <h2 id="request-dialog-title">Request a creator contact</h2>
            <p>Tell us which profile you need. Matching requests are grouped for faster research.</p>
            <form className="request-form" onSubmit={submit}>
              <div className="field-row">
                <label><span>Platform</span><select name="platform" aria-label="Platform" defaultValue={initialPlatform}><option value="instagram">Instagram</option><option value="youtube">YouTube</option><option value="facebook">Facebook</option></select></label>
                <label><span>Creator handle</span><input name="handle" aria-label="Creator handle" defaultValue={initialHandle} autoFocus required /></label>
              </div>
              <label><span>Notes (optional)</span><textarea name="notes" aria-label="Notes (optional)" rows={3} placeholder="Role needed, campaign timing, or useful context" /></label>
              {error ? <p className="form-error" role="alert">{error}</p> : null}
              <button className="button button-primary button-wide" disabled={busy}>{busy ? "Submitting…" : "Submit request"}{busy ? null : <Send size={17} aria-hidden="true" />}</button>
            </form>
          </div>
        )}
      </div>
    </dialog>
  );
}
