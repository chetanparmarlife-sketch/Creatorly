import { useEffect, useState } from "react";
import {
  ArrowLeft, ArrowUpRight, BadgeCheck, CheckCircle2, Clock3, Coins,
  Camera, LockKeyhole, MapPin, PlaySquare, Share2, ShieldCheck, Sparkles,
  Tags, UserRound,
} from "lucide-react";
import { useAppData } from "../data/AppData";
import type { AppRoute } from "../hooks/useRoute";
import { daysRemaining, formatFollowers } from "../lib/format";
import type { CreatorDetailData, CreatorSearchResult } from "../types";
import { ContactCard } from "./ContactCard";
import { CreatorPortrait } from "./CreatorPortrait";

function rankSimilarCreators(current: CreatorDetailData["creator"], candidates: CreatorSearchResult[]) {
  const primaryCategory = current.categories?.[0];
  return candidates
    .filter(candidate => candidate.id !== current.id)
    .sort((left, right) => {
      const leftMatches = primaryCategory && left.categories?.includes(primaryCategory) ? 1 : 0;
      const rightMatches = primaryCategory && right.categories?.includes(primaryCategory) ? 1 : 0;
      return rightMatches - leftMatches || right.followerCount - left.followerCount;
    })
    .slice(0, 4);
}

export function CreatorDetail({ creatorId, navigate, onBalanceChange }: {
  creatorId: string;
  navigate(route: AppRoute): void;
  onBalanceChange(): void;
}) {
  const data = useAppData();
  const [detail, setDetail] = useState<CreatorDetailData | null>();
  const [similarCreators, setSimilarCreators] = useState<CreatorSearchResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function loadDetail() {
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
    Promise.all([data.getDetail(creatorId), data.search("", {})])
      .then(([nextDetail, candidates]) => {
        if (!active) return;
        setDetail(nextDetail);
        setSimilarCreators(nextDetail ? rankSimilarCreators(nextDetail.creator, candidates) : []);
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
      await loadDetail();
      onBalanceChange();
    } catch (unlockError) {
      setError(unlockError instanceof Error ? unlockError.message : "Unlock failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function shareProfile() {
    const shareData = { title: detail?.creator.displayName ?? "Creator profile", url: window.location.href };
    if (navigator.share) {
      await navigator.share(shareData).catch(() => undefined);
      return;
    }
    await navigator.clipboard?.writeText(window.location.href).catch(() => undefined);
  }

  function scrollToContact() {
    document.getElementById("contact-access")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (detail === undefined) {
    return <main className="workspace"><div className="detail-skeleton" aria-label="Loading creator"><span /><span /><span /></div></main>;
  }
  if (!detail) {
    return <main className="workspace"><button className="back-button" onClick={() => navigate({ name: "search", query: "" })}><ArrowLeft size={18} /> Back to discovery</button><div className="state-card state-error">{error || "Creator not found."}</div></main>;
  }

  const creator = detail.creator;
  const upgradeRequired = !detail.isUnlocked && detail.availableContactCount === 0 && detail.hiddenProContactCount > 0;
  const insufficientCredits = detail.creditBalance < 5;
  const unlockAction = upgradeRequired || insufficientCredits ? () => navigate({ name: "pricing" }) : handleUnlock;
  const primaryContact = detail.contacts[0];

  return (
    <main className="workspace detail-workspace profile-detail">
      <header className="profile-toolbar">
        <button className="back-button" onClick={() => navigate({ name: "search", query: "" })}><ArrowLeft size={19} /> Back to discovery</button>
        <button className="profile-share" onClick={shareProfile}><Share2 size={17} /> Share profile</button>
      </header>

      <section className="profile-hero" aria-labelledby="creator-name">
        <div className="profile-cover" aria-hidden="true"><span /><span /><span /></div>
        <div className="profile-identity">
          <CreatorPortrait name={creator.displayName} platform={creator.platform} size="large" />
          <div>
            <div className="detail-labels"><span>{creator.platform}</span>{creator.isDemo ? <span className="demo-chip">Demo data</span> : null}</div>
            <h1 id="creator-name">{creator.displayName} {creator.isVerified ? <BadgeCheck size={22} aria-label="Platform verified" /> : null}</h1>
            <p><MapPin size={16} /> {creator.location ?? "Location unavailable"}</p>
          </div>
        </div>
        <div className="profile-rankings" aria-label="Creator highlights">
          {creator.categories?.[0] ? <span><Sparkles size={15} /> Strong in {creator.categories[0]}</span> : null}
          <span><ShieldCheck size={15} /> {creator.isVerified ? "Platform verified" : "Profile checked"}</span>
        </div>
        <div className="signal-rail" aria-label="Contact readiness">
          <span className="is-done"><CheckCircle2 size={16} /> Profile matched</span><i />
          <span className="is-done"><ShieldCheck size={16} /> Record checked</span><i />
          <span className={detail.isUnlocked ? "is-done" : "is-current"}>{detail.isUnlocked ? <CheckCircle2 size={16} /> : <LockKeyhole size={16} />} {detail.isUnlocked ? "Contact open" : "Unlock contact"}</span>
        </div>
      </section>

      <section className="profile-contact-strip">
        <div><strong>{detail.isUnlocked ? "Contact access is active" : "Ready to connect?"}</strong><span>{detail.isUnlocked ? `${daysRemaining(detail.expiresAt!)} days of access remaining` : `${detail.availableContactCount + detail.hiddenProContactCount} contact route${detail.availableContactCount + detail.hiddenProContactCount === 1 ? "" : "s"} found`}</span></div>
        <button className="button button-primary" onClick={scrollToContact}>{detail.isUnlocked ? "View contacts" : "See contact options"}<ArrowUpRight size={17} /></button>
      </section>

      <div className="profile-layout">
        <div className="profile-main-column">
          <section className="profile-section social-section" aria-labelledby="socials-title">
            <div className="profile-section-heading"><div><p className="eyebrow">Audience</p><h2 id="socials-title">Socials</h2></div></div>
            <div className="social-metrics">
              <article><span className={`social-icon social-icon-${creator.platform}`}>{creator.platform === "instagram" ? <Camera size={22} /> : <PlaySquare size={23} />}</span><strong>{formatFollowers(creator.followerCount)}</strong><small>{creator.platform === "youtube" ? "Subscribers" : "Followers"}</small><span className="social-handle">{creator.handle}</span></article>
              <article className="social-suggestion"><span className="social-icon"><Sparkles size={22} /></span><strong>Campaign fit</strong><small>{creator.categories?.slice(0, 2).join(" · ") || "General creator"}</small><span className="social-handle">Profile signal</span></article>
            </div>
          </section>

          <section className="profile-section profile-facts" aria-labelledby="profile-facts-title">
            <div className="profile-section-heading"><div><p className="eyebrow">About</p><h2 id="profile-facts-title">Creator profile</h2></div></div>
            <dl>
              <div><dt><MapPin size={20} /><span>Primary location</span></dt><dd>{creator.location ?? "Location unavailable"}</dd></div>
              <div><dt><Tags size={20} /><span>Content categories</span></dt><dd>{creator.categories?.join(", ") || "Not supplied"}</dd></div>
              <div><dt><UserRound size={20} /><span>Profile type</span></dt><dd>Independent creator</dd></div>
              <div><dt><ShieldCheck size={20} /><span>Profile status</span></dt><dd>{creator.isVerified ? "Platform verified" : "Creatorly checked"}</dd></div>
            </dl>
          </section>

          <section className="profile-section contact-access-section" id="contact-access" aria-labelledby="contact-access-title">
            {detail.isUnlocked ? (
              <div className="reveal-main">
                <div className="section-title-row"><div><p className="eyebrow">Contact card</p><h2 id="contact-access-title">Ready for outreach</h2></div><span className="access-timer"><Clock3 size={16} /> {daysRemaining(detail.expiresAt!)} days left</span></div>
                <div className="contact-stack">{detail.contacts.map(contact => <ContactCard key={contact.id} contact={contact} />)}</div>
                {detail.hiddenProContactCount > 0 ? <div className="pro-note"><LockKeyhole size={17} /><span><strong>{detail.hiddenProContactCount} representative contact hidden.</strong> <button className="inline-link" onClick={() => navigate({ name: "pricing" })}>Upgrade to Pro</button> to reveal it.</span></div> : null}
              </div>
            ) : (
              <div className="unlock-panel">
                <p className="eyebrow">{upgradeRequired ? "Pro contact" : "One master unlock"}</p>
                <h2 id="contact-access-title">{upgradeRequired ? "This creator is manager-led" : `Reveal ${detail.availableContactCount} ${detail.availableContactCount === 1 ? "contact" : "contacts"}`}</h2>
                <p>{upgradeRequired ? "The available contact is a manager or representative. Upgrade to Pro to unlock it." : "Get the role, direct contact point, outreach note, and verification date for 30 days."}</p>
                <div className="unlock-facts"><span><Coins size={18} /><strong>{upgradeRequired ? "Pro" : "5 credits"}</strong><small>{upgradeRequired ? "access needed" : "one-time unlock"}</small></span><span><Clock3 size={18} /><strong>30 days</strong><small>repeat access</small></span><span><ShieldCheck size={18} /><strong>Role-labelled</strong><small>contact context</small></span></div>
                {error ? <p className="form-error" role="alert">{error}</p> : null}
                <button className="button button-primary button-wide" onClick={unlockAction} disabled={busy}>{busy ? "Unlocking…" : upgradeRequired ? "Upgrade to Pro" : insufficientCredits ? "Get credits" : "Unlock for 5 credits"}</button>
                <p className="balance-note">Your balance: <strong>{detail.creditBalance} credits</strong>{!upgradeRequired && !insufficientCredits ? ` → ${detail.creditBalance - 5} after unlock` : ""}</p>
              </div>
            )}
          </section>
        </div>

        <aside className="profile-section similar-section" aria-labelledby="similar-title">
          <div className="profile-section-heading"><div><p className="eyebrow">Keep exploring</p><h2 id="similar-title">Similar creators</h2></div></div>
          <div className="similar-list">{similarCreators.map(similar => <button key={similar.id} onClick={() => navigate({ name: "creator", creatorId: similar.id })}><CreatorPortrait name={similar.displayName} platform={similar.platform} size="small" /><span><strong>{similar.displayName}</strong><small>{similar.categories?.[0] ?? "Creator"}</small><em>{formatFollowers(similar.followerCount)} · {similar.platform}</em></span><ArrowUpRight size={17} aria-hidden="true" /></button>)}</div>
        </aside>
      </div>

      <div className="mobile-profile-action">
        <span><small>{detail.isUnlocked ? "Contact open" : "Contact access"}</small><strong>{detail.isUnlocked ? primaryContact?.name ?? creator.displayName : upgradeRequired ? "Pro required" : "5 credits"}</strong></span>
        <button className="button button-primary" onClick={detail.isUnlocked ? scrollToContact : unlockAction} disabled={busy}>{detail.isUnlocked ? "View contacts" : busy ? "Unlocking…" : upgradeRequired ? "Upgrade" : "Unlock contact"}</button>
      </div>
    </main>
  );
}
