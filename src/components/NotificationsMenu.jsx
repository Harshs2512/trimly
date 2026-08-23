"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotificationsMenu() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef(null);

  async function load() {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) return;
      setItems(await response.json());
    } catch {
      // Non-critical UI; protected actions remain server-enforced.
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function closeOnOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, []);

  const unread = items.filter((item) => !item.read).length;
  async function markRead() {
    setLoading(true);
    try {
      const response = await fetch("/api/notifications", { method: "PUT" });
      if (response.ok) setItems((prev) => prev.map((item) => ({ ...item, read: true })));
    } finally { setLoading(false); }
  }

  return (
    <div className="relative" ref={menuRef}>
      <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <Bell className="w-5 h-5" />
        {unread > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center">{Math.min(unread, 99)}</span>}
      </Button>
      {open && <div className="absolute right-0 mt-2 w-80 max-w-[85vw] bg-popover border rounded-2xl shadow-xl z-50 overflow-hidden"><div className="p-4 border-b flex items-center justify-between"><div><h3 className="font-bold">Notifications</h3><p className="text-xs text-muted-foreground">Recent booking updates</p></div>{unread > 0 && <Button size="sm" variant="ghost" disabled={loading} onClick={markRead}><Check className="w-4 h-4 mr-1" />Read all</Button>}</div><div className="max-h-80 overflow-y-auto">{items.length ? items.slice(0, 12).map((item) => <div key={item._id} className={`p-4 border-b last:border-0 text-sm ${item.read ? "bg-background" : "bg-primary/5"}`}><p className="leading-relaxed">{item.message}</p><p className="text-xs text-muted-foreground mt-1">{item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}</p></div>) : <p className="p-6 text-center text-sm text-muted-foreground">No notifications yet.</p>}</div></div>}
    </div>
  );
}
