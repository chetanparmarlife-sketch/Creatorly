import { useState } from "react";
import { Check, Copy, Mail, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { contactRole, formatDate } from "../lib/format";
import type { CreatorContact } from "../types";

export function ContactCard({ contact }: { contact: CreatorContact }) {
  const [copied, setCopied] = useState<string | null>(null);

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

  return (
    <article className="contact-card">
      <div className="contact-card-head">
        <div>
          <span className="role-badge">{contactRole(contact.contactType)}</span>
          <h3>{contact.name}</h3>
        </div>
        <span className="verified-label"><ShieldCheck size={15} /> Demo verified</span>
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
      <footer>Demo record · checked {formatDate(contact.lastVerifiedAt)}</footer>
    </article>
  );
}
