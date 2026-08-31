import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, AtSign, BadgeCheck, BriefcaseBusiness, Check, ExternalLink, FileImage, FileText, LoaderCircle, ShieldCheck, Trash2, UserRound, WalletCards } from "lucide-react";
import { useAppData } from "../../data/AppData";
import type { AppRoute } from "../../hooks/useRoute";
import type { CreatorClaim, CreatorClaimProfileInput, CreatorClaimRate, CreatorContactPreference, CreatorVerificationMethod } from "../../types";
import { Logo } from "../../components/Logo";
import { EmailVerificationPrompt } from "../../components/EmailVerificationPrompt";
import { claimFormFromClaim, mergeUntouchedClaimForm, type ClaimFormState } from "./claimForm";
import "./claim.css";

const steps = ["Instagram", "Profile", "Business", "Assets & rates", "Verify", "Review"];
const splitList = (value: string) => value.split(",").map(item => item.trim()).filter(Boolean);
const messageOf = (error: unknown) => error instanceof Error ? error.message : "Something went wrong. Try again.";

function statusLabel(status: CreatorClaim["status"]) {
  return ({ draft: "Draft", enrichment_pending: "Public data queued", ready_for_verification: "Ready to verify", ownership_claimed_by_user: "Ownership asserted", verified: "Verified", review_required: "In review", published: "Published", rejected: "Changes required", suspended: "Suspended" })[status];
}

function ProfilePreview({ claim }: { claim: CreatorClaim }) {
  return <article className="claim-preview">
    <div className="claim-preview-mark">{claim.enrichedProfileImageUrl ? <img src={claim.enrichedProfileImageUrl} alt=""/> : <AtSign size={24}/>}</div>
    <div><p className="claim-kicker">Instagram creator</p><h3>{claim.displayName || claim.instagramHandle}</h3><a href={claim.instagramUrl} target="_blank" rel="noreferrer">{claim.instagramHandle} <ExternalLink size={13}/></a></div>
    <span className="claim-status"><i/>{statusLabel(claim.status)}</span>
    <dl>
      <div><dt>Categories</dt><dd>{claim.categories.join(", ") || "Not added"}</dd></div>
      <div><dt>Languages</dt><dd>{claim.languages.join(", ") || "Not added"}</dd></div>
      <div><dt>Location</dt><dd>{[claim.city, claim.country].filter(Boolean).join(", ") || "Not added"}</dd></div>
      <div><dt>Brand contact</dt><dd>{claim.contactPreference === "direct" ? "Contact me" : claim.contactPreference === "manager_only" ? "Manager only" : "Not available"}</dd></div>
      {claim.enrichedFollowerCount !== undefined ? <div><dt>Audience</dt><dd>{claim.enrichedFollowerCount.toLocaleString()} followers</dd></div> : null}
      {claim.enrichedEngagementRatePercent !== undefined ? <div><dt>Recent engagement</dt><dd>{claim.enrichedEngagementRatePercent}%</dd></div> : null}
    </dl>
  </article>;
}

export function ClaimProfileView({ authenticated, navigate }: { authenticated: boolean; navigate(route: AppRoute): void }) {
  const data = useAppData();
  const [claim, setClaim] = useState<CreatorClaim | null>(null);
  const [loading, setLoading] = useState(authenticated);
  const [instagram, setInstagram] = useState(() => window.sessionStorage.getItem("creatorly.pendingClaimInstagram") ?? "");
  const [lookupName, setLookupName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);
  const claimId = claim?._id;
  const enrichmentStatus = claim?.enrichmentStatus;

  async function refresh() {
    if (!authenticated) return;
    setLoading(true);
    try { setClaim(await data.getMyCreatorClaim()); }
    catch (nextError) { setError(messageOf(nextError)); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    let active = true;
    if (!authenticated) return () => { active = false; };
    data.getMyCreatorClaim()
      .then(nextClaim => { if (active) setClaim(nextClaim); })
      .catch(nextError => { if (active) setError(messageOf(nextError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [authenticated, data]);

  useEffect(() => {
    if (!authenticated || !claimId || !["queued", "running"].includes(enrichmentStatus ?? "")) return;
    let active = true;
    const timer = window.setTimeout(() => {
      void data.getMyCreatorClaim().then(nextClaim => {
        if (active) setClaim(nextClaim);
      }).catch(() => undefined);
    }, 1_200);
    return () => { active = false; window.clearTimeout(timer); };
  }, [authenticated, claimId, data, enrichmentStatus]);

  async function begin(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setLookupName("");
    try {
      const lookup = await data.lookupInstagram(instagram);
      window.sessionStorage.setItem("creatorly.pendingClaimInstagram", lookup.instagramUrl);
      if (lookup.match) setLookupName(lookup.match.displayName);
      if (!authenticated) { navigate({ name: "signup", reason: "creator-claim" }); return; }
      await data.startCreatorClaim(lookup.instagramUrl);
      window.sessionStorage.removeItem("creatorly.pendingClaimInstagram");
      await refresh();
      setStep(1);
    } catch (nextError) { setError(messageOf(nextError)); }
    finally { setBusy(false); }
  }

  async function signOut() {
    await data.signOut();
    navigate({ name: "landing" });
  }

  if (loading) return <main className="claim-page claim-loading" role="status"><LoaderCircle className="spin"/> Loading your profile claim…</main>;
  if (!authenticated || !claim) return <main className="claim-public">
    <header className="claim-public-header"><button className="brand-button" onClick={() => navigate({ name: "landing" })}><Logo/></button><button className="button button-secondary" onClick={() => authenticated ? void signOut() : navigate({ name: "login" })}>{authenticated ? "Sign out" : "Sign in"}</button></header>
    <section className="claim-hero">
      <p className="eyebrow">Creator-owned profiles</p>
      <h1>Own the profile <span>brands see.</span></h1>
      <p>Find your creator profile, make the details yours, and choose how brands should contact you.</p>
      <form className="claim-intake" onSubmit={begin}>
        <AtSign aria-hidden="true"/><input aria-label="Instagram URL or handle" value={instagram} onChange={event => setInstagram(event.target.value)} placeholder="@handle or instagram.com/handle" required autoFocus/>
        <button className="button button-primary" disabled={busy}>{busy ? "Checking…" : authenticated ? "Start claim" : "Claim my profile"}<ArrowRight size={17}/></button>
      </form>
      {lookupName ? <p className="claim-found"><Check size={15}/> Found {lookupName}. Continue to prove ownership.</p> : null}
      {error ? <EmailVerificationPrompt error={error} navigate={navigate} returnTo="/claim/profile"/> : null}
      <p className="claim-no-oauth"><ShieldCheck size={16}/> You control what brands see and who they contact.</p>
    </section>
    <section className="claim-public-proof"><div><strong>01</strong><span>Submit your public Instagram URL</span></div><div><strong>02</strong><span>Add business details and rates</span></div><div><strong>03</strong><span>Verify ownership and publish</span></div></section>
  </main>;

  return <ClaimWizard claim={claim} step={step} setStep={setStep} refresh={refresh} navigate={navigate} error={error} setError={setError}/>;
}

function ClaimWizard({ claim, step, setStep, refresh, navigate, error, setError }: { claim: CreatorClaim; step: number; setStep(value: number): void; refresh(): Promise<void>; navigate(route: AppRoute): void; error: string; setError(value: string): void }) {
  const data = useAppData();
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(Boolean(claim.termsAcceptedAt));
  const touchedFields = useRef(new Set<keyof ClaimFormState>());
  const [form, setForm] = useState(() => claimFormFromClaim(claim));
  const [rates, setRates] = useState<CreatorClaimRate[]>(claim.rates.length ? claim.rates : ["Instagram Reel", "Instagram Post", "Instagram Story"].map(deliverableType => ({ deliverableType, currency: "INR", negotiable: true })));
  const completedThrough = useMemo(() => claim.status === "published" ? 5 : claim.status === "review_required" ? 5 : claim.status === "ownership_claimed_by_user" ? 4 : claim.status === "ready_for_verification" ? 3 : claim.categories.length && claim.languages.length ? 2 : 0, [claim]);

  useEffect(() => {
    setForm(current => mergeUntouchedClaimForm(current, claim, touchedFields.current));
  }, [claim]);

  function field<K extends keyof ClaimFormState>(name: K, value: ClaimFormState[K]) {
    touchedFields.current.add(name);
    setForm(current => ({ ...current, [name]: value }));
  }
  function payload(): CreatorClaimProfileInput { return { claimId: claim._id, displayName: form.displayName, biography: form.biography || undefined, categories: splitList(form.categories), languages: splitList(form.languages), country: form.country || undefined, city: form.city || undefined, postalCode: form.postalCode || undefined, websiteUrl: form.websiteUrl || undefined, businessEmail: form.businessEmail || undefined, whatsapp: form.whatsapp || undefined, managementType: form.managementType as "self_managed" | "talent_managed", managerName: form.managerName || undefined, managerEmail: form.managerEmail || undefined, managerWhatsapp: form.managerWhatsapp || undefined, contactPreference: form.contactPreference, rates }; }

  async function saveAndGo(next: number) {
    setBusy(true); setError("");
    try { await data.saveCreatorClaim(payload()); await refresh(); setStep(next); }
    catch (nextError) { setError(messageOf(nextError)); }
    finally { setBusy(false); }
  }
  async function upload(event: ChangeEvent<HTMLInputElement>, kind: "media_kit" | "audience_screenshot") {
    const file = event.target.files?.[0]; if (!file) return;
    setBusy(true); setError("");
    try { await data.uploadCreatorClaimAsset(claim._id, kind, file); await refresh(); }
    catch (nextError) { setError(messageOf(nextError)); }
    finally { setBusy(false); event.target.value = ""; }
  }
  async function removeAsset(assetId: string) { setBusy(true); try { await data.removeCreatorClaimAsset(assetId); await refresh(); } catch (nextError) { setError(messageOf(nextError)); } finally { setBusy(false); } }
  async function issue(method: CreatorVerificationMethod) { setBusy(true); setError(""); try { await data.saveCreatorClaim(payload()); await data.issueCreatorVerification(claim._id, method); await refresh(); } catch (nextError) { setError(messageOf(nextError)); } finally { setBusy(false); } }
  async function submitVerification() { setBusy(true); setError(""); try { await data.submitCreatorVerification(claim._id); await refresh(); setStep(5); } catch (nextError) { setError(messageOf(nextError)); } finally { setBusy(false); } }
  async function submitClaim() { setBusy(true); setError(""); try { await data.submitCreatorClaim(claim._id, accepted); await refresh(); } catch (nextError) { setError(messageOf(nextError)); } finally { setBusy(false); } }
  async function signOut() { await data.signOut(); navigate({ name: "landing" }); }

  return <main className="claim-page">
    <header className="claim-topbar"><button className="brand-button" onClick={() => navigate({ name: "landing" })}><Logo/></button><div><span className="claim-status"><i/>{statusLabel(claim.status)}</span><button className="button button-secondary" onClick={() => void signOut()}>Sign out</button></div></header>
    <div className="claim-layout">
      <aside className="claim-rail"><p className="claim-kicker">Profile claim</p><h1>{claim.displayName || claim.instagramHandle}</h1><a href={claim.instagramUrl} target="_blank" rel="noreferrer">{claim.instagramHandle}<ExternalLink size={12}/></a><nav aria-label="Claim progress">{steps.map((label, index) => <button key={label} className={step === index ? "active" : ""} onClick={() => setStep(index)}><span>{index <= completedThrough ? <Check size={14}/> : index + 1}</span>{label}</button>)}</nav><p className="claim-rail-help">Your work is saved when you continue. Private files are only visible to Creatorly reviewers.</p></aside>
      <section className="claim-workspace">
        {claim.status === "review_required" ? <div className="claim-state-banner"><BadgeCheck/><div><strong>Your claim is in review</strong><p>Creatorly will check the ownership proof and submitted business details.</p></div></div> : null}
        {claim.status === "published" ? <div className="claim-state-banner success"><BadgeCheck/><div><strong>Your profile is published</strong><p>You now control the business details brands see and how they can contact you.</p></div></div> : null}
        {claim.reviewNote ? <div className="claim-review-note"><strong>Reviewer note</strong><p>{claim.reviewNote}</p></div> : null}
        {step === 0 ? <StepShell icon={<AtSign/>} kicker="Step 1 of 6" title="Your creator identity" description="Start with the public profile brands can recognise. You can review and change every detail before publishing."><ProfilePreview claim={claim}/><div className="claim-data-note">{claim.enrichmentStatus === "complete" ? <Check size={18}/> : <LoaderCircle className={claim.enrichmentStatus === "running" ? "spin" : ""} size={18}/>}<div><strong>{claim.enrichmentStatus === "complete" ? "Your starting details are ready" : claim.enrichmentStatus === "failed" ? "Add your details yourself" : claim.enrichmentStatus === "running" ? "Preparing your profile" : "Your profile is being prepared"}</strong><p>{claim.enrichmentStatus === "failed" ? "We could not add the public details right now. You can still complete and submit your profile." : "Review what is here, then change anything that does not represent you."}</p></div></div><Footer busy={busy} onNext={() => setStep(1)}/></StepShell> : null}
        {step === 1 ? <StepShell icon={<UserRound/>} kicker="Step 2 of 6" title="Shape your public profile" description="Add details brands use to understand fit. Use commas between categories and languages."><div className="claim-form-grid"><Field label="Creator or channel name" value={form.displayName} onChange={value => field("displayName", value)} required/><Field label="Categories" hint="Example: Beauty, Lifestyle" value={form.categories} onChange={value => field("categories", value)} required/><Field label="Languages" hint="Example: Hindi, English" value={form.languages} onChange={value => field("languages", value)} required/><label className="wide"><span>Bio</span><textarea value={form.biography} onChange={event => field("biography", event.target.value)} rows={4} placeholder="What do you create, and who is your audience?"/></label><Field label="Country" value={form.country} onChange={value => field("country", value)} required/><Field label="City" value={form.city} onChange={value => field("city", value)}/><Field label="PIN / postal code" value={form.postalCode} onChange={value => field("postalCode", value)}/><Field label="Website" type="url" value={form.websiteUrl} onChange={value => field("websiteUrl", value)} placeholder="https://"/></div><Footer busy={busy} onBack={() => setStep(0)} onNext={() => void saveAndGo(2)}/></StepShell> : null}
        {step === 2 ? <StepShell icon={<BriefcaseBusiness/>} kicker="Step 3 of 6" title="Control brand contact" description="Choose who receives business enquiries. These details stay private until a brand has access."><div className="claim-segment"><button className={form.managementType === "self_managed" ? "active" : ""} onClick={() => field("managementType", "self_managed")}>I manage myself</button><button className={form.managementType === "talent_managed" ? "active" : ""} onClick={() => field("managementType", "talent_managed")}>I have a manager</button></div><div className="claim-form-grid"><Field label="Business email" type="email" value={form.businessEmail} onChange={value => field("businessEmail", value)} placeholder="business@example.com"/><Field label="WhatsApp" type="tel" value={form.whatsapp} onChange={value => field("whatsapp", value)} placeholder="+91…"/>{form.managementType === "talent_managed" ? <><Field label="Manager name" value={form.managerName} onChange={value => field("managerName", value)}/><Field label="Manager email" type="email" value={form.managerEmail} onChange={value => field("managerEmail", value)}/><Field label="Manager WhatsApp" type="tel" value={form.managerWhatsapp} onChange={value => field("managerWhatsapp", value)}/></> : null}<label className="wide"><span>Who can brands contact?</span><select value={form.contactPreference} onChange={event => field("contactPreference", event.target.value as CreatorContactPreference)}><option value="direct">Contact me directly</option><option value="manager_only">Contact my manager only</option><option value="not_contactable">Do not allow brand contact</option></select></label></div><Footer busy={busy} onBack={() => setStep(1)} onNext={() => void saveAndGo(3)}/></StepShell> : null}
        {step === 3 ? <StepShell icon={<WalletCards/>} kicker="Step 4 of 6" title="Package your commercial profile" description="Indicative rates help brands qualify opportunities. You can mark every rate negotiable."><div className="claim-rates">{rates.map((rate, index) => <div className="claim-rate" key={rate.deliverableType}><strong>{rate.deliverableType}</strong><input aria-label={`${rate.deliverableType} minimum rate`} type="number" min="0" placeholder="Minimum ₹" value={rate.minimum ?? ""} onChange={event => setRates(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, minimum: event.target.value ? Number(event.target.value) : undefined } : item))}/><input aria-label={`${rate.deliverableType} maximum rate`} type="number" min="0" placeholder="Maximum ₹" value={rate.maximum ?? ""} onChange={event => setRates(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, maximum: event.target.value ? Number(event.target.value) : undefined } : item))}/><label><input type="checkbox" checked={rate.negotiable} onChange={event => setRates(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, negotiable: event.target.checked } : item))}/> Negotiable</label></div>)}</div><div className="claim-upload-grid"><UploadCard icon={<FileText/>} title="Media kit" detail="One PDF, up to 20 MB" accept="application/pdf" disabled={busy} onChange={event => void upload(event, "media_kit")}/><UploadCard icon={<FileImage/>} title="Audience screenshots" detail="JPG, PNG or WebP, up to 8 MB" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event => void upload(event, "audience_screenshot")}/></div>{claim.assets.length ? <ul className="claim-assets">{claim.assets.map(asset => <li key={asset._id}><span>{asset.kind === "media_kit" ? <FileText/> : <FileImage/>}<span><strong>{asset.fileName}</strong><small>{Math.ceil(asset.byteSize / 1024)} KB</small></span></span><button aria-label={`Remove ${asset.fileName}`} onClick={() => void removeAsset(asset._id)}><Trash2 size={16}/></button></li>)}</ul> : null}<div className="claim-future"><strong>Later connections</strong><span>Shopify</span><span>Affiliate accounts</span><small>These are not connected in this version.</small></div><Footer busy={busy} onBack={() => setStep(2)} onNext={() => void saveAndGo(4)}/></StepShell> : null}
        {step === 4 ? <StepShell icon={<ShieldCheck/>} kicker="Step 5 of 6" title="Prove profile ownership" description="Choose one proof. Instagram bio codes are checked automatically; other methods are assertions for admin review.">
          <div className="verification-options">
            <VerificationOption title="Instagram bio code" description="Automatically checked against the public Instagram bio." selected={claim.verificationMethod === "instagram_bio"} disabled={busy} onClick={() => void issue("instagram_bio")}/>
            <VerificationOption title="Business email · asserted only" description="No email is sent or checked yet. An admin reviews your assertion." selected={claim.verificationMethod === "business_email"} disabled={busy || !form.businessEmail} onClick={() => void issue("business_email")}/>
            <VerificationOption title="Website backlink · asserted only" description="The backlink is not checked automatically yet. An admin reviews your assertion." selected={claim.verificationMethod === "website_backlink"} disabled={busy || !form.websiteUrl} onClick={() => void issue("website_backlink")}/>
          </div>
          {claim.verificationCode ? <div className="claim-code"><p>Your temporary verification code</p><strong>{claim.verificationCode}</strong><small>{claim.verificationMethod === "instagram_bio" ? "Place this in your Instagram bio. Creatorly will check the public bio when you continue." : claim.verificationMethod === "business_email" ? `This records only your assertion about ${form.businessEmail}; no email check runs yet.` : "This records only your assertion about the backlink; no website check runs yet."}</small></div> : null}
          <Footer busy={busy} onBack={() => setStep(3)} nextLabel={claim.status === "ownership_claimed_by_user" || claim.status === "review_required" || claim.status === "published" ? "Continue" : claim.verificationMethod === "instagram_bio" ? "Check Instagram bio" : "Assert ownership"} disabled={!claim.verificationCode} onNext={() => claim.status === "ownership_claimed_by_user" || claim.status === "review_required" || claim.status === "published" ? setStep(5) : void submitVerification()}/>
        </StepShell> : null}
        {step === 5 ? <StepShell icon={<BadgeCheck/>} kicker="Step 6 of 6" title="Review before submission" description="This is the identity and business information Creatorly will review."><ProfilePreview claim={{ ...claim, ...payload() }}/>{claim.status !== "review_required" && claim.status !== "published" ? <label className="claim-declaration"><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)}/><span><strong>I confirm this profile represents me or a creator I am authorised to manage.</strong><small>I understand that false ownership claims may be rejected or suspended.</small></span></label> : null}<Footer busy={busy} onBack={() => setStep(4)} nextLabel={claim.status === "review_required" ? "Submitted for review" : claim.status === "published" ? "Profile published" : "Submit claim"} disabled={!accepted || claim.status === "review_required" || claim.status === "published"} onNext={() => void submitClaim()}/></StepShell> : null}
        {error ? <div className="claim-error"><EmailVerificationPrompt error={error} navigate={navigate} returnTo="/claim/profile"/></div> : null}
      </section>
    </div>
  </main>;
}

function StepShell({ icon, kicker, title, description, children }: { icon: ReactNode; kicker: string; title: string; description: string; children: ReactNode }) { return <div className="claim-step"><div className="claim-step-heading"><span>{icon}</span><div><p className="claim-kicker">{kicker}</p><h2>{title}</h2><p>{description}</p></div></div>{children}</div>; }
function Field({ label, hint, value, onChange, required, type = "text", placeholder }: { label: string; hint?: string; value: string; onChange(value: string): void; required?: boolean; type?: string; placeholder?: string }) { return <label><span>{label}{required ? " *" : ""}</span><input type={type} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder ?? hint}/>{hint ? <small>{hint}</small> : null}</label>; }
function Footer({ busy, onBack, onNext, nextLabel = "Save and continue", disabled = false }: { busy: boolean; onBack?: () => void; onNext(): void; nextLabel?: string; disabled?: boolean }) { return <footer className="claim-footer">{onBack ? <button className="button button-secondary" disabled={busy} onClick={onBack}><ArrowLeft size={16}/>Back</button> : <span/>}<button className="button button-primary" disabled={busy || disabled} onClick={onNext}>{busy ? "Saving…" : nextLabel}<ArrowRight size={16}/></button></footer>; }
function UploadCard({ icon, title, detail, accept, disabled, onChange }: { icon: ReactNode; title: string; detail: string; accept: string; disabled: boolean; onChange(event: ChangeEvent<HTMLInputElement>): void }) { return <label className="claim-upload">{icon}<strong>{title}</strong><span>{detail}</span><input type="file" accept={accept} disabled={disabled} onChange={onChange}/><small>Choose file</small></label>; }
function VerificationOption({ title, description, selected, disabled, onClick }: { title: string; description: string; selected: boolean; disabled: boolean; onClick(): void }) { return <button className={selected ? "selected" : ""} disabled={disabled} onClick={onClick}><span>{selected ? <Check/> : null}</span><strong>{title}</strong><small>{description}</small></button>; }
