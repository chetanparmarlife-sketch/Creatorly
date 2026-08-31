import { useEffect, useState } from "react";
import {
  ArrowLeft, ArrowUpRight, BadgeCheck, CheckCircle2, Clock3, Coins,
  AtSign, Camera, ExternalLink, Languages, Link2, LockKeyhole, MapPin, PlaySquare,
  Share2, ShieldCheck, Sparkles, Tags, UserRound,
} from "lucide-react";
import { useAppData } from "../data/AppData";
import type { AppRoute } from "../hooks/useRoute";
import { daysRemaining, formatFollowers } from "../lib/format";
import { rankSimilarCreators, type SimilarCreatorMatch } from "../lib/similarCreators";
import type { CreatorDetailData } from "../types";
import { ContactCard } from "./ContactCard";
import { CreatorPortrait } from "./CreatorPortrait";
import { EmailVerificationPrompt } from "./EmailVerificationPrompt";
import { CONTACT_ACCESS_WINDOW_DAYS, CONTACT_UNLOCK_COST } from "../../convex/lib/creditPolicy";

function formatPerformanceMetric(value: number) {
  return value < 10_000
    ? value.toLocaleString("en-IN", { maximumFractionDigits: 2 })
    : formatFollowers(value);
}

export function CreatorDetail({ creatorId, navigate, onBalanceChange }: {
  creatorId: string;
  navigate(route: AppRoute): void;
  onBalanceChange(): void;
}) {
  const data = useAppData();
  const [detail, setDetail] = useState<CreatorDetailData | null>();
  const [similarCreators, setSimilarCreators] = useState<SimilarCreatorMatch[]>([]);
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
    const detailPromise = data.getDetail(creatorId);
    const broadPoolPromise = data.search("", {});
    detailPromise
      .then(async (nextDetail) => {
        if (!nextDetail) return { nextDetail, candidates: [] };
        const [sameCategory, broadPool] = await Promise.all([
          nextDetail.creator.categories?.[0]
            ? data.search("", { category: nextDetail.creator.categories[0] })
            : Promise.resolve([]),
          broadPoolPromise,
        ]);
        const candidates = [...new Map([...sameCategory, ...broadPool].map(candidate => [candidate.id, candidate])).values()];
        return { nextDetail, candidates };
      })
      .then(({ nextDetail, candidates }) => {
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
    return <main className="workspace"><button className="back-button" onClick={() => navigate({ name: "discover" })}><ArrowLeft size={18} /> Back to discovery</button><div className="state-card state-error">{error || "Creator not found."}</div></main>;
  }

  const creator = detail.creator;
  const freshnessLabel = creator.lastUpdatedAt ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(creator.lastUpdatedAt) : "Update date unavailable";
  const instagramMetrics = creator.instagramMetrics;
  const youtubeMetrics = creator.youtubeMetrics;
  const facebookMetrics = creator.facebookMetrics;
  const instagramPerformanceMetrics = instagramMetrics ? [
    { label: "Following", value: instagramMetrics.followingCount, suffix: "", context: "accounts followed" },
    { label: "Posts", value: instagramMetrics.postCount, suffix: "", context: "published posts" },
    { label: "Average likes", value: instagramMetrics.averageLikes, suffix: "", context: instagramMetrics.minLikes !== undefined && instagramMetrics.maxLikes !== undefined ? `${formatPerformanceMetric(instagramMetrics.minLikes)}–${formatPerformanceMetric(instagramMetrics.maxLikes)} observed range` : "per post" },
    { label: "Average comments", value: instagramMetrics.averageComments, suffix: "", context: instagramMetrics.minComments !== undefined && instagramMetrics.maxComments !== undefined ? `${formatPerformanceMetric(instagramMetrics.minComments)}–${formatPerformanceMetric(instagramMetrics.maxComments)} observed range` : "per post" },
    { label: "Engagement rate", value: instagramMetrics.engagementRatePercent, suffix: "%", context: "supplied engagement rate" },
    { label: "Average reel views", value: instagramMetrics.averageReelViews, suffix: "", context: instagramMetrics.minReelViews !== undefined && instagramMetrics.maxReelViews !== undefined ? `${formatPerformanceMetric(instagramMetrics.minReelViews)}–${formatPerformanceMetric(instagramMetrics.maxReelViews)} observed range` : "per reel" },
    { label: "Average video views", value: instagramMetrics.averageVideoViews, suffix: "", context: instagramMetrics.minVideoViews !== undefined && instagramMetrics.maxVideoViews !== undefined ? `${formatPerformanceMetric(instagramMetrics.minVideoViews)}–${formatPerformanceMetric(instagramMetrics.maxVideoViews)} observed range` : "per video" },
    { label: "Highlights", value: instagramMetrics.highlightReelCount, suffix: "", context: "highlight reels" },
    { label: "IGTV videos", value: instagramMetrics.igtvVideoCount, suffix: "", context: "published videos" },
  ].filter((metric) => metric.value !== undefined) : [];
  const youtubePerformanceMetrics = youtubeMetrics ? [
    { label: "Videos", value: youtubeMetrics.videoCount, suffix: "", context: "published videos" },
    { label: "Lifetime views", value: youtubeMetrics.totalVideoViews, suffix: "", context: "channel total" },
    { label: "Measured views", value: youtubeMetrics.views, suffix: "", context: "supplied analytics window" },
    { label: "Likes", value: youtubeMetrics.likes, suffix: "", context: "supplied analytics window" },
    { label: "Comments", value: youtubeMetrics.comments, suffix: "", context: "supplied analytics window" },
    { label: "Shares", value: youtubeMetrics.shares, suffix: "", context: "supplied analytics window" },
    { label: "Average viewed", value: youtubeMetrics.averageViewPercentage, suffix: "%", context: "average view percentage" },
    { label: "Average duration", value: youtubeMetrics.averageViewDuration, suffix: " sec", context: "average view duration" },
    { label: "Minutes watched", value: youtubeMetrics.estimatedMinutesWatched, suffix: "", context: "estimated total" },
    { label: "Integrated rate", value: youtubeMetrics.integratedVideoRateMin, suffix: "", context: youtubeMetrics.integratedVideoRateMax !== undefined ? `up to ${formatPerformanceMetric(youtubeMetrics.integratedVideoRateMax)}` : "supplied minimum" },
    { label: "Sponsored rate", value: youtubeMetrics.sponsoredVideoRateMin, suffix: "", context: youtubeMetrics.sponsoredVideoRateMax !== undefined ? `up to ${formatPerformanceMetric(youtubeMetrics.sponsoredVideoRateMax)}` : "supplied minimum" },
    { label: "Average rate", value: youtubeMetrics.averageRate, suffix: "", context: youtubeMetrics.priceRange ?? "supplied rate" },
  ].filter((metric) => metric.value !== undefined) : [];
  const facebookPerformanceMetrics = facebookMetrics ? [
    { label: "Engagement rate", value: facebookMetrics.engagementRatePercent, suffix: "%", context: "supplied engagement rate" },
    { label: "Engaged users", value: facebookMetrics.pageEngagedUsers, suffix: "", context: "page engaged users" },
    { label: "Post engagements", value: facebookMetrics.pagePostEngagements, suffix: "", context: "page post engagement" },
    { label: "Page impressions", value: facebookMetrics.pageImpressions, suffix: "", context: "total impressions" },
    { label: "Organic impressions", value: facebookMetrics.pageImpressionsOrganic, suffix: "", context: "organic impressions" },
    { label: "Paid impressions", value: facebookMetrics.pageImpressionsPaid, suffix: "", context: "paid impressions" },
    { label: "Unique impressions", value: facebookMetrics.pageImpressionsUnique, suffix: "", context: "unique reach signal" },
    { label: "Page views", value: facebookMetrics.pageViewsTotal, suffix: "", context: "total page views" },
    { label: "Average rate", value: facebookMetrics.averageRate, suffix: "", context: facebookMetrics.priceRange ?? "supplied rate" },
    { label: "Story rate", value: facebookMetrics.storyRateMin, suffix: "", context: facebookMetrics.storyRateMax !== undefined ? `up to ${formatPerformanceMetric(facebookMetrics.storyRateMax)}` : "supplied minimum" },
    { label: "Post rate", value: facebookMetrics.postRateMin, suffix: "", context: facebookMetrics.postRateMax !== undefined ? `up to ${formatPerformanceMetric(facebookMetrics.postRateMax)}` : "supplied minimum" },
    { label: "Video rate", value: facebookMetrics.videoRateMin, suffix: "", context: facebookMetrics.videoRateMax !== undefined ? `up to ${formatPerformanceMetric(facebookMetrics.videoRateMax)}` : "supplied minimum" },
  ].filter((metric) => metric.value !== undefined) : [];
  const performanceMetrics = creator.platform === "youtube" ? youtubePerformanceMetrics : creator.platform === "facebook" ? facebookPerformanceMetrics : instagramPerformanceMetrics;
  const upgradeRequired = !detail.isUnlocked && detail.availableContactCount === 0 && detail.hiddenProContactCount > 0;
  const verificationPending = !detail.isUnlocked && detail.availableContactCount === 0 && detail.hiddenProContactCount === 0 && detail.pendingContactCount > 0;
  const insufficientCredits = detail.creditBalance < CONTACT_UNLOCK_COST;
  const unlockAction = upgradeRequired || insufficientCredits ? () => navigate({ name: "pricing" }) : handleUnlock;
  const primaryContact = detail.contacts[0];
  const socialProfiles = creator.socialProfiles?.length ? creator.socialProfiles : [{
    platform: creator.platform,
    handle: creator.handle,
    url: creator.platform === "youtube"
      ? creator.youtubeChannelId ? `https://www.youtube.com/channel/${encodeURIComponent(creator.youtubeChannelId)}` : `https://www.youtube.com/@${encodeURIComponent(creator.handle.replace(/^@/, ""))}`
      : creator.platform === "facebook"
        ? creator.handle.startsWith("@") ? `https://www.facebook.com/${encodeURIComponent(creator.handle.replace(/^@/, ""))}` : `https://www.facebook.com/profile.php?id=${encodeURIComponent(creator.facebookPageId ?? creator.handle)}`
        : `https://www.instagram.com/${encodeURIComponent(creator.handle.replace(/^@/, ""))}/`,
    followerCount: creator.followerCount,
    isVerified: creator.isVerified,
  }];
  const talentManaged = creator.managementType === "talent_managed" || upgradeRequired;

  function socialIcon(platform: string) {
    if (platform === "instagram") return <Camera size={22} />;
    if (platform === "youtube") return <PlaySquare size={23} />;
    if (platform === "linkedin") return <Link2 size={22} />;
    return <AtSign size={22} />;
  }

  return (
    <main className="workspace detail-workspace profile-detail">
      <header className="profile-toolbar">
        <button className="back-button" onClick={() => navigate({ name: "discover" })}><ArrowLeft size={19} /> Back to discovery</button>
        <button className="profile-share" onClick={shareProfile}><Share2 size={17} /> Share profile</button>
      </header>

      <section className="profile-hero" aria-labelledby="creator-name">
        <div className="profile-cover" aria-hidden="true"><span /><span /><span /></div>
        <div className="profile-identity">
          <CreatorPortrait name={creator.displayName} platform={creator.platform} imageUrl={creator.profileImageUrl} size="large" />
          <div>
            <div className="detail-labels"><span>{creator.platform}</span><span>{creator.sourceLabel ?? "Creatorly database"}</span>{creator.isDemo ? <span className="demo-chip">Demo data</span> : null}</div>
            <h1 id="creator-name">{creator.displayName} {creator.isVerified ? <BadgeCheck size={22} aria-label="Platform verified" /> : null}</h1>
            <p><MapPin size={16} /> {creator.location ?? "Location unavailable"}</p>
            <p className="profile-freshness"><Clock3 size={16}/> Updated {freshnessLabel} · {creator.metricProvenance === "live" ? "Live metrics" : "Supplied metrics"}</p>
          </div>
        </div>
        <div className="profile-rankings" aria-label="Creator highlights">
          {creator.categories?.[0] ? <span><Sparkles size={15} /> Strong in {creator.categories[0]}</span> : null}
          <span><ShieldCheck size={15} /> {creator.isVerified ? "Platform badge present" : "Imported profile"}</span>
        </div>
        <div className="signal-rail" aria-label="Contact readiness">
          <span className="is-done"><CheckCircle2 size={16} /> Profile matched</span><i />
          <span className="is-done"><ShieldCheck size={16} /> Profile indexed</span><i />
          <span className={detail.isUnlocked ? "is-done" : "is-current"}>{detail.isUnlocked ? <CheckCircle2 size={16} /> : <LockKeyhole size={16} />} {detail.isUnlocked ? "Contact open" : verificationPending ? "Unavailable" : "Unlock contact"}</span>
        </div>
      </section>

      <section className="profile-contact-strip">
        <div><strong>{talentManaged ? "Talent managed" : "Self managed"} · {detail.isUnlocked ? "Contact access is active" : verificationPending ? "Contact unavailable" : "Ready to connect"}</strong><span>{detail.isUnlocked ? `${daysRemaining(detail.expiresAt!)} days of access remaining` : verificationPending ? "Imported contact · verification in progress" : talentManaged ? "Unlock the manager or representative responsible for partnerships" : `Reach ${creator.displayName} directly when a direct route is available`}</span></div>
        <button className="button button-primary" onClick={scrollToContact}>{detail.isUnlocked ? "View contacts" : "See contact options"}<ArrowUpRight size={17} /></button>
      </section>

      <div className="profile-layout">
        <div className="profile-main-column">
          <section className="profile-section social-section" aria-labelledby="socials-title">
            <div className="profile-section-heading"><div><p className="eyebrow">Audience</p><h2 id="socials-title">Socials</h2></div></div>
            <div className="social-metrics">
              {socialProfiles.map(profile => <a key={`${profile.platform}-${profile.handle}`} href={profile.url} target="_blank" rel="noreferrer" aria-label={`Open ${creator.displayName} on ${profile.platform}`}><span className={`social-icon social-icon-${profile.platform}`}>{socialIcon(profile.platform)}</span><strong>{profile.followerCount === undefined ? profile.platform : formatFollowers(profile.followerCount)}</strong><small>{profile.followerCount === undefined ? "Open profile" : profile.platform === "youtube" ? "Subscribers" : "Followers"}</small><span className="social-handle">{profile.handle}<ExternalLink size={12} /></span></a>)}
            </div>
          </section>

          {performanceMetrics.length ? <section className="profile-section creator-performance" aria-labelledby="performance-title">
            <div className="profile-section-heading"><div><p className="eyebrow">{creator.platform === "youtube" ? "YouTube performance" : creator.platform === "facebook" ? "Facebook performance" : "Instagram performance"} · Supplied metrics</p><h2 id="performance-title">Audience and engagement</h2></div></div>
            <div className="performance-metrics">{performanceMetrics.map(metric => <article key={metric.label}><small>{metric.label}</small><strong>{formatPerformanceMetric(metric.value!)}{metric.suffix}</strong><span>{metric.context}</span></article>)}</div>
            {youtubeMetrics?.audience?.length ? <div className="youtube-audience"><h3>Audience age and gender</h3><div>{youtubeMetrics.audience.map(item => <span key={`${item.ageGroup}-${item.gender}`}><strong>{item.percentage.toLocaleString("en-IN", { maximumFractionDigits: 1 })}%</strong><small>{item.ageGroup} · {item.gender}</small></span>)}</div></div> : null}
            {facebookMetrics?.audience?.length ? <div className="youtube-audience"><h3>Audience age and gender</h3><div>{facebookMetrics.audience.map(item => <span key={`${item.ageGroup}-${item.gender}`}><strong>{formatPerformanceMetric(item.value)}</strong><small>{item.ageGroup} · {item.gender}</small></span>)}</div></div> : null}
            {facebookMetrics?.audienceCities?.length ? <div className="youtube-audience"><h3>Top audience cities</h3><div>{[...facebookMetrics.audienceCities].sort((a, b) => b.value - a.value).slice(0, 12).map(item => <span key={item.city}><strong>{formatPerformanceMetric(item.value)}</strong><small>{item.city}</small></span>)}</div></div> : null}
          </section> : null}

          <section className="profile-section profile-facts" aria-labelledby="profile-facts-title">
            <div className="profile-section-heading"><div><p className="eyebrow">About</p><h2 id="profile-facts-title">Creator profile</h2></div></div>
            <dl>
              <div><dt><Languages size={20} /><span>Content language</span></dt><dd>{creator.contentLanguages?.join(", ") || "Not supplied"}</dd></div>
              <div><dt><MapPin size={20} /><span>Primary location</span></dt><dd>{creator.location ?? "Location unavailable"}</dd></div>
              <div><dt><Tags size={20} /><span>Content categories</span></dt><dd>{creator.categories?.join(", ") || "Not supplied"}</dd></div>
              <div><dt><UserRound size={20} /><span>Profile type</span></dt><dd>{creator.profileType || "Creator"}</dd></div>
              <div><dt><ShieldCheck size={20} /><span>Content quality</span></dt><dd>{creator.contentQuality || "Not rated"}</dd></div>
              {creator.biography ? <div><dt><AtSign size={20} /><span>Biography</span></dt><dd>{creator.biography}</dd></div> : null}
              {creator.gender || creator.age !== undefined ? <div><dt><UserRound size={20} /><span>Profile demographics</span></dt><dd>{[creator.gender, creator.age !== undefined ? `Age ${creator.age}` : ""].filter(Boolean).join(" · ")}</dd></div> : null}
              {instagramMetrics?.businessCategoryName ? <div><dt><Tags size={20} /><span>Business category</span></dt><dd>{instagramMetrics.businessCategoryName}{instagramMetrics.isBusinessAccount ? " · Business account" : ""}</dd></div> : null}
              {facebookMetrics?.websiteUrl ? <div><dt><Link2 size={20} /><span>Website</span></dt><dd><a href={facebookMetrics.websiteUrl} target="_blank" rel="noreferrer">Open supplied website <ExternalLink size={12}/></a></dd></div> : null}
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
              <div className={`unlock-panel${verificationPending ? " is-unavailable" : ""}`}>
                {verificationPending ? <>
                  <p className="eyebrow">Verification in progress</p>
                  <h2 id="contact-access-title">This contact is unavailable.</h2>
                  <p>We imported a contact for this creator, but we have not checked it yet. It cannot be purchased, and no contact details will be shown.</p>
                  <button className="button button-secondary button-wide" type="button" disabled>Unavailable until verified</button>
                  <p className="balance-note">Your balance stays at <strong>{detail.creditBalance} credits</strong>.</p>
                </> : <>
                <p className="eyebrow">{upgradeRequired ? "Pro contact" : "One master unlock"}</p>
                <h2 id="contact-access-title">{upgradeRequired ? "This creator is manager-led" : `Reveal ${detail.availableContactCount} ${detail.availableContactCount === 1 ? "contact" : "contacts"}`}</h2>
                <p>{upgradeRequired ? "The available contact is a manager or representative. Upgrade to Pro to unlock it." : `Get the role, direct contact point, outreach note, and verification date for ${CONTACT_ACCESS_WINDOW_DAYS} days.`}</p>
                <div className="unlock-facts"><span><Coins size={18} /><strong>{upgradeRequired ? "Pro" : `${CONTACT_UNLOCK_COST} credits`}</strong><small>{upgradeRequired ? "access needed" : "one-time unlock"}</small></span><span><Clock3 size={18} /><strong>{CONTACT_ACCESS_WINDOW_DAYS} days</strong><small>repeat access</small></span><span><ShieldCheck size={18} /><strong>Role-labelled</strong><small>contact context</small></span></div>
                {error ? <EmailVerificationPrompt error={error} navigate={navigate} returnTo={`/creator/${creatorId}`}/> : null}
                <button className="button button-primary button-wide" onClick={unlockAction} disabled={busy}>{busy ? "Unlocking…" : upgradeRequired ? "Upgrade to Pro" : insufficientCredits ? "Get credits" : `Unlock for ${CONTACT_UNLOCK_COST} credits`}</button>
                <p className="balance-note">Your balance: <strong>{detail.creditBalance} credits</strong>{!upgradeRequired && !insufficientCredits ? ` → ${detail.creditBalance - CONTACT_UNLOCK_COST} after unlock` : ""}</p>
                </>}
              </div>
            )}
          </section>
        </div>

        <aside className="profile-section similar-section" aria-labelledby="similar-title">
          <div className="profile-section-heading"><div><p className="eyebrow">Keep exploring</p><h2 id="similar-title">Similar creators</h2><p>Matched by niche, audience, market, and profile fit.</p></div></div>
          {similarCreators.length ? <div className="similar-list">{similarCreators.map(({ creator: similar, reasons }) => <button key={similar.id} onClick={() => navigate({ name: "creator", creatorId: similar.id })} aria-label={`Open ${similar.displayName}, matched for ${reasons.join(" and ")}`}><CreatorPortrait name={similar.displayName} platform={similar.platform} imageUrl={similar.profileImageUrl} size="small" /><span><strong>{similar.displayName}</strong><small>{formatFollowers(similar.followerCount)} · {similar.platform}</small><span className="similar-reasons">{reasons.map(reason => <span key={reason}>{reason}</span>)}</span></span><ArrowUpRight size={17} aria-hidden="true" /></button>)}</div> : <p className="similar-empty">No strong profile matches yet.</p>}
        </aside>
      </div>

      <div className="mobile-profile-action">
        <span><small>{detail.isUnlocked ? "Contact open" : "Contact access"}</small><strong>{detail.isUnlocked ? primaryContact?.name ?? creator.displayName : verificationPending ? "Unavailable" : upgradeRequired ? "Pro required" : `${CONTACT_UNLOCK_COST} credits`}</strong></span>
        <button className="button button-primary" onClick={detail.isUnlocked ? scrollToContact : verificationPending ? scrollToContact : unlockAction} disabled={busy || verificationPending}>{detail.isUnlocked ? "View contacts" : verificationPending ? "Verification pending" : busy ? "Unlocking…" : upgradeRequired ? "Upgrade" : "Unlock contact"}</button>
      </div>
    </main>
  );
}
