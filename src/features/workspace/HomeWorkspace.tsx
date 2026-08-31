import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CheckSquare, Clock3, FolderKanban, Search, Users } from "lucide-react";
import type { AppRoute } from "../../hooks/useRoute";
import type { WorkspaceHomeSummary, WorkspaceSummary } from "../../types";
import { useWorkspaceData } from "./WorkspaceData";

function relativeDate(timestamp: number) {
  const days = Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
  return days === 0 ? "Today" : days === 1 ? "Yesterday" : `${days} days ago`;
}

export function HomeWorkspace({ workspace, navigate }: { workspace: WorkspaceSummary; navigate(route: AppRoute): void }) {
  const store = useWorkspaceData();
  const [summary, setSummary] = useState<WorkspaceHomeSummary>();
  const [error, setError] = useState("");
  const load = useCallback(() => store.getWorkspaceHome(workspace.id).then(setSummary).catch(() => setError("Home could not load. Check your connection and try again.")), [store, workspace.id]);
  useEffect(() => { void load(); }, [load]);
  if (error) return <main className="workspace ops-page"><section className="ops-load-state" role="alert"><h1>Home could not load</h1><p>{error}</p><button className="button button-primary" onClick={() => { setError(""); setSummary(undefined); void load(); }}>Try again</button></section></main>;
  if (!summary) return <main className="workspace ops-page"><div className="ops-loading" role="status">Loading workspace home…</div></main>;
  const focal = summary.activeCampaigns[0];
  return <main className="workspace ops-page home-workspace">
    <header className="ops-header"><div><p className="eyebrow">Workspace home</p><h1>{workspace.name}</h1><p>Your current creator and campaign work, without placeholder numbers.</p></div><button className="button button-primary" onClick={() => navigate({ name: "discover" })}><Search size={16}/> Discover creators</button></header>
    <section className="home-metrics" aria-label="Workspace metrics"><button onClick={() => navigate({ name: "creators" })}><Users/><span>Saved creators</span><strong>{summary.savedCreatorCount}</strong></button><button onClick={() => navigate({ name: "campaigns" })}><FolderKanban/><span>Active campaigns</span><strong>{summary.activeCampaignCount}</strong></button><button onClick={() => navigate({ name: "campaigns" })}><CheckSquare/><span>Pending reviews</span><strong>{summary.pendingReviewCount}</strong></button></section>
    <div className="home-dashboard-grid">
      <section className="home-focal"><header><div><p className="eyebrow">Active campaign</p><h2>{focal?.name ?? "No active campaign"}</h2></div>{focal ? <button className="text-button" onClick={() => navigate({ name: "campaign", campaignId: focal.id })}>Open campaign <ArrowRight size={14}/></button> : null}</header>{focal ? <><p>{focal.goal}</p><div><span><strong>{focal.creatorCount}</strong> creators</span><span><strong>{focal.pendingReviewCount}</strong> pending reviews</span><span>Updated <strong>{relativeDate(focal.updatedAt)}</strong></span></div></> : <div className="home-empty-action"><p>Create a campaign when you have a real brief. No sample campaign has been added.</p><button className="button button-secondary" onClick={() => navigate({ name: "campaigns" })}>Create campaign</button></div>}</section>
      <section className="home-actions"><header><p className="eyebrow">Next actions</p><h2>Needs attention</h2></header>{summary.overdueTasks.length || summary.pendingReviews.length ? <div>{summary.overdueTasks.map(task => <button key={task.id} onClick={() => navigate(task.campaignId ? { name: "campaign", campaignId: task.campaignId } : { name: "campaigns" })}><Clock3/><span><strong>{task.title}</strong><small>Overdue task</small></span><ArrowRight/></button>)}{summary.pendingReviews.map(review => <button key={review.id} onClick={() => navigate({ name: "campaign", campaignId: review.campaignId })}><CheckSquare/><span><strong>{review.title}</strong><small>{review.campaignName} · waiting for review</small></span><ArrowRight/></button>)}</div> : <div className="home-empty-action"><p>No overdue tasks or pending reviews.</p><button className="text-button" onClick={() => navigate({ name: "campaigns" })}>View campaigns</button></div>}</section>
      <section className="home-activity"><header><p className="eyebrow">Recent activity</p><h2>Workspace updates</h2></header>{summary.recentActivity.length ? <ol>{summary.recentActivity.map(item => <li key={item.id}><span/><div><strong>{item.summary}</strong><small>{relativeDate(item.createdAt)}</small></div></li>)}</ol> : <div className="home-empty-action"><p>Activity will appear after your team saves creators or starts campaign work.</p><button className="text-button" onClick={() => navigate({ name: "discover" })}>Start with discovery</button></div>}</section>
    </div>
  </main>;
}
