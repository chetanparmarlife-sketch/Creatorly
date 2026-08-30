import { useState } from "react";
import { Check, Copy, Mail, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { useAppData } from "../data/AppData";
import { contactRole, formatDate } from "../lib/format";
import type { CreatorContact } from "../types";

export function ContactCard({ contact }: { contact: CreatorContact }) {
  const [copied, setCopied] = useState<string | null>(null);
  const [reportState, setReportState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const { reportWrongContact } = useAppData();

  async function copy(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1600);
  }

  const fields = [
    contact.email ? { label: "Email", value: contact.email, href: `mailto:${contact.email}`, icon: Mail } : null,
    contact.phone ? { label: "Phone", value: contact.phone, href: `tel:${contact.phone}`, icon: Phone } : null,
    contact.whatsapp ? { label: "WhatsApp", value: contact.whatsapp, href: `https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`, icon: MessageCircle } : null,
  ].filter((field) => field !== null);
  const statusLabel = contact.isDemo ? "Demo verified" : contact.verificationStatus === "verified" ? "Verified" : contact.verificationStatus === "pending_verification" ? "Pending verification" : "Unverified";

  async function report() {
    setReportState("sending");
    try {
      await reportWrongContact(contact.id);
      setReportState("sent");
    } catch {
      setReportState("error");
    }
  }

  return (
    <article className="contact-card">
      <div className="contact-card-head">
        <div>
          <span className="role-badge">{contactRole(contact.contactType)}</span>
          <h3>{contact.name}</h3>
        </div>
        <span className={`verified-label verified-${contact.verificationStatus}`}><ShieldCheck size={15} /> {statusLabel}</span>
      </div>
      <div className="contact-fields">
        {fields.map(({ label, value, href, icon: Icon }) => (
          <div className="contact-field" key={label}>
            <span className="contact-field-icon"><Icon size={17} /></span>
            <span>
              <small>{label}</small>
              <a href={href} target={label === "WhatsApp" ? "_blank" : undefined} rel="noreferrer">{value}</a>
            </span>
            <button className="copy-button" onClick={() => copy(label, value)} aria-label={`Copy ${label.toLowerCase()}`}>
              {copied === label ? <Check size={17} /> : <Copy size={17} />}
            </button>
          </div>
        ))}
      </div>
      {contact.contextualNotes ? <p className="contact-note">“{contact.contextualNotes}”</p> : null}
      <footer>
        <span>{contact.isDemo ? `Demo record · checked ${formatDate(contact.lastVerifiedAt)}` : contact.verificationStatus === "verified" ? `Last verified ${formatDate(contact.lastVerifiedAt)}` : "Imported record · verification pending"}</span>
        <button className="report-contact" type="button" onClick={report} disabled={reportState === "sending" || reportState === "sent"}>
          {reportState === "sending" ? "Reporting…" : reportState === "sent" ? "Report received" : "Report wrong contact"}
        </button>
        {reportState === "error" ? <span className="report-error" role="alert">Could not save the report. Try again.</span> : null}
      </footer>
    </article>
  );
}
