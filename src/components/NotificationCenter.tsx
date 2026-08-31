import { Bell, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useAppData } from "../data/AppData";
import type { AppNotification } from "../types";

export function NotificationCenter() {
  const data = useAppData(); const [open, setOpen] = useState(false); const [items, setItems] = useState<AppNotification[]>([]);
  useEffect(() => { if (open) data.listNotifications().then(setItems); }, [data, open]);
  const unread = items.filter(item => !item.readAt).length;
  return <div className="notification-wrap"><button className="icon-button" title="Notifications" aria-label="Notifications" aria-expanded={open} onClick={() => setOpen(v => !v)}><Bell size={18}/>{unread ? <i>{unread}</i> : null}</button>{open ? <section className="notification-popover"><header><strong>Notifications</strong><span>{unread} unread</span></header>{items.length ? items.map(item => <button key={item._id} className={item.readAt ? "" : "is-unread"} onClick={async () => { await data.markNotificationRead(item._id); setItems(current => current.map(n => n._id === item._id ? { ...n, readAt: Date.now() } : n)); if (item.href) { const url = new URL(item.href, window.location.origin); window.history.pushState({}, "", url.pathname); window.dispatchEvent(new PopStateEvent("popstate")); setOpen(false); } }}><CheckCircle2 size={16}/><span><strong>{item.title}</strong><small>{item.message}</small></span></button>) : <p>No notifications yet.</p>}</section> : null}</div>;
}
