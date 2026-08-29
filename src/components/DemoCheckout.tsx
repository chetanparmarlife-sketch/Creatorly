import { CreditCard, LockKeyhole, X } from "lucide-react";
import { useState } from "react";

export function DemoCheckout({ title, detail, amount, onClose, onConfirm }: { title: string; detail: string; amount: string; onClose(): void; onConfirm(): Promise<void> }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  return <div className="checkout-backdrop" role="presentation"><section className="checkout-card" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
    <button className="dialog-close" aria-label="Close checkout" onClick={onClose}><X/></button>
    <p className="demopay-brand"><CreditCard size={18}/> DemoPay</p><h2 id="checkout-title">{title}</h2><p>{detail}</p>
    <div className="checkout-total"><span>Demo total</span><strong>{amount}</strong></div>
    <div className="demo-card"><small>TEST CARD</small><strong>4242 4242 4242 4242</strong><span>12/30&nbsp;&nbsp; 123</span></div>
    <p className="demo-disclosure"><LockKeyhole size={14}/> No real money or card data is processed.</p>
    {error ? <p className="form-error">{error}</p> : null}
    <button className="button button-primary button-wide" disabled={busy} onClick={async () => { setBusy(true); setError(""); try { await onConfirm(); } catch (e) { setError(e instanceof Error ? e.message : "Demo payment failed."); setBusy(false); } }}>{busy ? "Processing…" : "Confirm demo payment"}</button>
  </section></div>;
}
