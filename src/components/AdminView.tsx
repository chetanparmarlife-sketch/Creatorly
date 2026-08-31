import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AtSign, BadgeCheck, Camera, CheckCircle2, Inbox, PlaySquare, ShieldCheck } from "lucide-react";
import { useAppData } from "../data/AppData";
import { formatDate } from "../lib/format";
import type { AdminContactRequest, AdminCreatorClaim, AdminUser, FulfillRequestInput } from "../types";

export function AdminView() {
  const data = useAppData();
  const [requests, setRequests] = useState<AdminContactRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [claims, setClaims] = useState<AdminCreatorClaim[]>([]);
  const [claimNote, setClaimNote] = useState("");

  const selected = useMemo(
    () => requests.find((request) => request.id === selectedId) ?? requests[0] ?? null,
    [requests, selectedId],
  );

  const loadRequests = async () => {
    const nextRequests = await data.listAdminRequests();
    setRequests(nextRequests);
    setSelectedId((current) => nextRequests.some((request) => request.id === current) ? current : nextRequests[0]?.id ?? null);
  };

  useEffect(() => {
    let active = true;
    Promise.all([data.listAdminRequests(), data.listAdminUsers(), data.listCreatorClaimsForAdmin()])
      .then(([nextRequests, nextUsers, nextClaims]) => {
        if (!active) return;
        setRequests(nextRequests);
        setSelectedId(nextRequests[0]?.id ?? null);
        setUsers(nextUsers);
        setClaims(nextClaims);
      })
      .catch((nextError) => {
        if (active) setError(nextError instanceof Error ? nextError.message : "Could not load requests.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [data]);

  async function fulfill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError("");
    setSuccess("");
    const form = new FormData(event.currentTarget);
    const input: FulfillRequestInput = {
      requestId: selected.id,
      creator: {
        platform: selected.requestedPlatform,
        handle: selected.requestedHandle,
        displayName: String(form.get("displayName") ?? ""),
        followerCount: Number(form.get("followerCount") ?? 0),
        location: String(form.get("location") ?? ""),
        isVerified: form.get("isVerified") === "on",
      },
      contact: {
        contactType: String(form.get("contactType")) as FulfillRequestInput["contact"]["contactType"],
        name: String(form.get("contactName") ?? ""),
        email: String(form.get("contactEmail") ?? ""),
        contextualNotes: String(form.get("contactNotes") ?? ""),
        accessTier: String(form.get("accessTier")) as "basic" | "pro",
      },
    };
    try {
      const result = await data.fulfillRequest(input);
      setSuccess(`Fulfilled ${result.fulfilledCount} matching ${result.fulfilledCount === 1 ? "request" : "requests"}. In-app notifications were delivered.`);
      await loadRequests();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not fulfill this request.");
    } finally {
      setBusy(false);
    }
  }

  async function reviewClaim(claimId: string, decision: "approve" | "reject" | "request_changes") {
    setBusy(true); setError(""); setSuccess("");
    try {
      await data.reviewCreatorClaim(claimId, decision, claimNote);
      setClaims(await data.listCreatorClaimsForAdmin());
      setClaimNote("");
      setSuccess(decision === "approve" ? "Creator profile verified and published." : decision === "reject" ? "Ownership claim rejected." : "Claim returned to the creator with requested changes.");
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : "Could not review this claim."); }
    finally { setBusy(false); }
  }

  return (
    <main className="workspace admin-workspace">
      <section className="admin-intro">
        <div><p className="eyebrow">Repository operations</p><h1>Fulfillment queue</h1><p>Turn requested profiles into verified, role-labelled contact records.</p></div>
        <div className="admin-queue-count"><Inbox size={18} aria-hidden="true" /><strong>{requests.length}</strong><span>pending</span></div>
      </section>
      {success ? <div className="admin-message admin-success" role="status"><CheckCircle2 size={18} />{success}</div> : null}
      {error ? <div className="state-card state-error" role="alert">{error}</div> : null}
      {loading ? <div className="admin-loading"><span /><span /></div> : null}
      {!loading && requests.length === 0 ? <section className="admin-empty"><span className="empty-orbit"><CheckCircle2 size={23} /></span><h2>The request queue is clear</h2><p>New missing-contact requests will appear here.</p></section> : null}
      {!loading && requests.length > 0 && selected ? (
        <div className="admin-layout">
          <section className="admin-queue" aria-label="Pending contact requests">
            {requests.map((request) => <button key={request.id} className={request.id === selected.id ? "is-selected" : ""} onClick={() => { setSelectedId(request.id); setSuccess(""); }}>
              <span className="admin-platform">{request.requestedPlatform === "instagram" ? <Camera size={15} /> : request.requestedPlatform === "youtube" ? <PlaySquare size={16} /> : <AtSign size={15}/>}</span>
              <span><strong>{request.requestedHandle}</strong><small>{request.requester.companyName} · {formatDate(request.requestDate)}</small></span>
            </button>)}
          </section>
          <section className="admin-panel">
            <header><div><p className="eyebrow">Selected request</p><h2>{selected.requestedHandle}</h2></div><span className="admin-requester">Requested by <strong>{selected.requester.name}</strong><small>{selected.requester.email}</small></span></header>
            {selected.notes ? <p className="admin-request-note">“{selected.notes}”</p> : null}
            <form className="admin-form" key={selected.id} onSubmit={fulfill}>
              <fieldset><legend>Creator record</legend><div className="field-row"><label><span>Creator display name</span><input name="displayName" aria-label="Creator display name" required /></label><label><span>Follower count</span><input name="followerCount" aria-label="Follower count" type="number" min="0" required /></label></div><label><span>Location</span><input name="location" aria-label="Location" /></label><label className="check-field"><input name="isVerified" type="checkbox" /><span><BadgeCheck size={16} /> Platform verified</span></label></fieldset>
              <fieldset><legend>Contact record</legend><div className="field-row"><label><span>Contact role</span><select name="contactType" defaultValue="manager"><option value="creator_direct">Creator direct</option><option value="manager">Manager</option><option value="agent">Agent</option><option value="assistant">Assistant</option><option value="pr_rep">PR representative</option></select></label><label><span>Access tier</span><select name="accessTier" defaultValue="pro"><option value="basic">Basic</option><option value="pro">Pro</option></select></label></div><div className="field-row"><label><span>Contact name</span><input name="contactName" aria-label="Contact name" required /></label><label><span>Contact email</span><input name="contactEmail" aria-label="Contact email" type="email" required /></label></div><label><span>Contact notes</span><textarea name="contactNotes" rows={2} /></label></fieldset>
              <button className="button button-primary button-wide" disabled={busy}><ShieldCheck size={17} />{busy ? "Fulfilling…" : "Mark fulfilled"}</button>
            </form>
          </section>
        </div>
      ) : null}
      <section className="admin-users admin-claims">
        <div><p className="eyebrow">Creator ownership</p><h2>Profile claim reviews</h2><p>{claims.length} awaiting ownership review</p></div>
        {claims.length === 0 ? <p className="admin-claim-empty">No creator claims are awaiting review.</p> : <div className="admin-claim-list">{claims.map(claim => <article key={claim._id}>
          <header><span><strong>{claim.displayName || claim.instagramHandle}</strong><small>{claim.instagramHandle} · {claim.claimant.name} · {claim.claimant.email}</small></span><b>{claim.verifiedAt && claim.verificationMethod === "instagram_bio" ? "Instagram bio verified automatically" : claim.verificationMethod ? `${claim.verificationMethod.replaceAll("_", " ")} · asserted by claimant, not checked` : "No ownership method"}</b></header>
          <dl><div><dt>Categories</dt><dd>{claim.categories.join(", ")}</dd></div><div><dt>Location</dt><dd>{[claim.city, claim.country].filter(Boolean).join(", ")}</dd></div><div><dt>Contact</dt><dd>{claim.contactPreference.replaceAll("_", " ")}</dd></div><div><dt>Proof code</dt><dd>{claim.verificationCode ?? "—"}</dd></div></dl>
          <textarea aria-label={`Review note for ${claim.instagramHandle}`} rows={2} placeholder="Reviewer note or requested change" value={claimNote} onChange={event => setClaimNote(event.target.value)}/>
          <footer><button className="button button-secondary" disabled={busy} onClick={() => void reviewClaim(claim._id, "reject")}>Reject</button><button className="button button-secondary" disabled={busy} onClick={() => void reviewClaim(claim._id, "request_changes")}>Request changes</button><button className="button button-primary" disabled={busy} onClick={() => void reviewClaim(claim._id, "approve")}><ShieldCheck size={16}/>Approve & publish</button></footer>
        </article>)}</div>}
      </section>
      <section className="admin-users"><div><p className="eyebrow">User management</p><h2>Workspace accounts</h2></div><div className="admin-user-list">{users.map(user => <article key={user.id}><span><strong>{user.name}</strong><small>{user.email} · {user.companyName}</small></span><b>{user.currentPlanTier}</b><em>{user.creditBalance} credits</em><i>{user.subscriptionStatus}</i></article>)}</div></section>
    </main>
  );
}
