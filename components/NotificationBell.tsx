
'use client';
import { useState, useEffect, useRef } from 'react';
import { getBrowserSupabase } from '../lib/supabase-browser';

type Notification = {
  id: number;
  type: string;
  message: string;
  url: string | null;
  read: boolean;
  created_at: string;
};


export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  // Removed unused userId state
  const bellRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Fetch notifications for logged-in user
  useEffect(() => {
    const supabase = getBrowserSupabase();
    let channel: ReturnType<typeof supabase.channel> | undefined;
    async function load() {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) {
        setNotifications([]);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('notifications')
        .select('id, type, message, url, read, created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(20);
      setNotifications(data || []);
      setLoading(false);

      // Real-time subscription for new notifications
      if (channel) supabase.removeChannel(channel);
      channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` },
          (payload) => {
            setNotifications((prev) => [payload.new as Notification, ...prev]);
          }
        )
        .subscribe();
    }
    load();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={bellRef} className="relative inline-block">
      <button
        aria-label="Notifications"
        className={`relative p-2 rounded-full ${open ? 'bg-gray-100' : 'bg-transparent'} border-none cursor-pointer outline-none`}
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        {/* Bell icon SVG */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6 text-gray-700"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a2.25 2.25 0 01-4.714 0M21 19.5v-2.25A2.25 2.25 0 0018.75 15a6.75 6.75 0 01-13.5 0A2.25 2.25 0 003 17.25V19.5m18 0H3"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-600 text-white text-xs rounded-full px-2 min-w-[18px] text-center border-2 border-white leading-[18px]">
            {unreadCount}
          </span>
        )}
      </button>
      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-y-auto">
          <div className="px-4 py-4 border-b font-semibold text-gray-700">Notifications</div>
          {loading ? (
            <div className="py-4 text-center text-gray-400 text-sm">Loading…</div>
          ) : notifications.length === 0 ? (
            <div className="py-4 text-center text-gray-400 text-sm">No notifications</div>
          ) : (
            <ul className="list-none m-0 p-0">
              {notifications.map((n, idx) => (
                <li
                  key={n.id}
                  className={`px-4 py-3 border-b transition-colors ${n.read ? 'bg-white opacity-70 cursor-default' : 'bg-blue-50 cursor-pointer'}`}
                  onClick={async () => {
                    if (n.read) return;
                    setNotifications((prev) => prev.map((x, i) => i === idx ? { ...x, read: true } : x));
                    const supabase = getBrowserSupabase();
                    await supabase.from('notifications').update({ read: true }).eq('id', n.id);
                  }}
                  title={n.read ? undefined : 'Mark as read'}
                >
                  <div className={`font-${n.read ? 'medium' : 'bold'} text-gray-900`}>{n.message}</div>
                  {n.url ? (
                    <a href={n.url} className="text-blue-600 underline text-xs" onClick={e => e.stopPropagation()}>
                      View
                    </a>
                  ) : null}
                  <div className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</div>
                  {!n.read && (
                    <span className="ml-2 text-blue-600 text-xs">(Click to mark as read)</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
