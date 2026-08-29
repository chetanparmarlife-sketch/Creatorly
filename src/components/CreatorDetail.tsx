import { useEffect, useState } from "react";
import { ArrowLeft, BadgeCheck, CheckCircle2, Clock3, Coins, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { useAppData } from "../data/AppData";
import type { AppRoute } from "../hooks/useRoute";
import { daysRemaining, formatFollowers, initials } from "../lib/format";
import type { CreatorDetailData } from "../types";
import { ContactCard } from "./ContactCard";

export function CreatorDetail({
  creatorId,
  navigate,
  onBalanceChange,
}: {
  creatorId: string;
  navigate(route: AppRoute): void;
  onBalanceChange(): void;
}) {
  const data = useAppData();
  const [detail, setDetail] = useState<CreatorDetailData | null>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      setDetail(await data.getDetail(creatorId));
    } catch {
      setDetail(null);
      setError("This creator could not be loaded. Try returning to search.");
    }
  }

  useEffect(() => {
    let active = true;
    data.getDetail(creatorId)
      .then((nextDetail) => {
        if (active) setDetail(nextDetail);
      })
      .catch(() => {
        if (active) {
          setDetail(null);
          setError("This creator could not be loaded. Try returning to search.");
        }
      });
    return () => { active = false; };
  }, [creatorId, data]);

  async function handleUnlock() {
    setBusy(true);
    setError("");
    try {
      await data.unlock(creatorId);
      await load();
      onBalanceChange();
    } catch (unlockError) {
      setError(unlockError instanceof Error ? unlockError.message : "Unlock failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (detail === undefined) {
    return <main className="workspace"><div className="detail-skeleton" aria-label="Loading creator"><span /><span /><span /></div></main>;
  }
  if (!detail) {
    return (
      <main className="workspace">
        <button className="back-button" onClick={() => navigate({ name: "search", query: "" })}><ArrowLeft size={18} /> Back to search</button>
        <div className="state-card state-error">{error || "Creator not found."}</div>
      </main>
    );
  }

  const creator = detail.creator;
  const upgradeRequired = !detail.isUnlocked && detail.availableContactCount === 0 && detail.hiddenProContactCount > 0;
  const insufficientCredits = detail.creditBalance < 5;

  return (
    <main className="workspace detail-workspace">
      <button className="back-button" onClick={() => navigate({ name: "search", query: "" })}><ArrowLeft size={18} /> Back to search</button>

      <section className="creator-hero">
        <span className={`creator-avatar creator-avatar-${creator.platform} creator-avatar-large`} aria-hidden="true">{initials(creator.displayName)}</span>
        <div className="creator-hero-copy">
          <div className="detail-labels">
            <span>{creator.platform}</span>
            {creator.isDemo ? <span className="demo-chip">Demo data</span> : null}
          </div>
          <h1>{creator.displayName} {creator.isVerified ? <BadgeCheck size={24} aria-label="Platform verified" /> : null}</h1>
          <p>{creator.handle} · {formatFollowers(creator.followerCount)} followers · {creator.location ?? "Location unavailable"}</p>
        </div>
        <div className="signal-rail" aria-label="Contact readiness">
          <span className="is-done"><CheckCircle2 size={16} /> Profile matched</span>
          <i />
          <span className="is-done"><ShieldCheck size={16} /> Record checked</span>
          <i />
          <span className={detail.isUnlocked ? "is-done" : "is-current"}>{detail.isUnlocked ? <CheckCircle2 size={16} /> : <LockKeyhole size={16} />} {detail.isUnlocked ? "Contact open" : "Unlock contact"}</span>
        </div>
      </section>

      {detail.isUnlocked ? (
        <section className="reveal-layout">
          <div className="reveal-main">
            <div className="section-title-row">
              <div>
                <p className="eyebrow">Contact card</p>
                <h2>Ready for outreach</h2>
              </div>
              <span className="access-timer"><Clock3 size={16} /> {daysRemaining(detail.expiresAt!)} days left</span>
            </div>
            <div className="contact-stack">
              {detail.contacts.map((contact) => <ContactCard key={contact.id} contact={contact} />)}
            </div>
            {detail.hiddenProContactCount > 0 ? (
              <div className="pro-note"><LockKeyhole size={17} /><span><strong>{detail.hiddenProContactCount} representative contact hidden.</strong> Manager and agent access arrives with Pro plan support after M1.</span></div>
            ) : null}
          </div>
          <aside className="access-summary">
            <Sparkles size={20} />
            <h3>Access active</h3>
            <p>Return to this creator any time during the next {daysRemaining(detail.expiresAt!)} days. You won’t pay again.</p>
            <dl><div><dt>Unlocked</dt><dd>5 credits</dd></div><div><dt>Expires</dt><dd>{new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(detail.expiresAt!)}</dd></div></dl>
          </aside>
        </section>
      ) : (
        <section className="unlock-layout">
          <div className="locked-preview" aria-hidden="true">
            <div className="blurred-card"><span /><strong>{creator.displayName}</strong><p>••••••••@••••••.com</p><p>+91 ••••• •••••</p></div>
            <span className="lock-orbit"><LockKeyhole size={24} /></span>
          </div>
          <div className="unlock-panel">
            <p className="eyebrow">{upgradeRequired ? "Pro contact" : "One master unlock"}</p>
            <h2>{upgradeRequired ? "This creator is manager-led" : `Reveal ${detail.availableContactCount} ${detail.availableContactCount === 1 ? "contact" : "contacts"}`}</h2>
            <p>{upgradeRequired ? "The only available contact is a manager or representative. Pro tier support is deferred from M1." : "Get the role, direct contact point, outreach note, and verification date for 30 days."}</p>
            <div className="unlock-facts">
              <span><Coins size={18} /><strong>{upgradeRequired ? "Pro" : "5 credits"}</strong><small>{upgradeRequired ? "access needed" : "one-time unlock"}</small></span>
              <span><Clock3 size={18} /><strong>30 days</strong><small>repeat access</small></span>
              <span><ShieldCheck size={18} /><strong>Role-labelled</strong><small>contact context</small></span>
            </div>
            {error ? <p className="form-error" role="alert">{error}</p> : null}
            <button className="button button-primary button-wide" onClick={handleUnlock} disabled={busy || insufficientCredits || upgradeRequired}>
              {busy ? "Unlocking…" : upgradeRequired ? "Pro access coming after M1" : insufficientCredits ? "Not enough credits" : "Unlock for 5 credits"}
            </button>
            <p className="balance-note">Your balance: <strong>{detail.creditBalance} credits</strong>{!upgradeRequired ? ` → ${detail.creditBalance - 5} after unlock` : ""}</p>
          </div>
        </section>
      )}
    </main>
  );
}
