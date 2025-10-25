
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
  const [userId, setUserId] = useState<string | null>(null);
  const bellRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Fetch notifications for logged-in user
  useEffect(() => {
    const supabase = getBrowserSupabase();
    let authSub: any;
    let channel: any;
    async function load() {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      setUserId(uid ?? null);
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
    authSub = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      load();
    });
    return () => {
      authSub?.data?.subscription?.unsubscribe?.();
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
    <div ref={bellRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        aria-label="Notifications"
        style={{
          position: 'relative',
          padding: 8,
          borderRadius: '50%',
          background: open ? '#f3f4f6' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          outline: 'none',
        }}
        onClick={() => setOpen((v) => !v)}
      >
        {/* Bell icon SVG */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          style={{ width: 24, height: 24, color: '#374151' }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a2.25 2.25 0 01-4.714 0M21 19.5v-2.25A2.25 2.25 0 0018.75 15a6.75 6.75 0 01-13.5 0A2.25 2.25 0 003 17.25V19.5m18 0H3"
          />
        </svg>
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              background: 'red',
              color: 'white',
              fontSize: 12,
              borderRadius: '50%',
              padding: '0 6px',
              minWidth: 18,
              textAlign: 'center',
              border: '2px solid #fff',
              lineHeight: '18px',
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>
      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            marginTop: 8,
            width: 320,
            maxHeight: 384,
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            boxShadow: '0 2px 16px rgba(0,0,0,0.15)',
            zIndex: 100,
            overflowY: 'auto',
          }}
        >
          <div style={{ padding: '16px', borderBottom: '1px solid #f3f4f6', fontWeight: 600, color: '#374151' }}>
            Notifications
          </div>
          {loading ? (
            <div style={{ padding: 16, textAlign: 'center', color: '#6b7280', fontSize: 14 }}>Loading…</div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', color: '#6b7280', fontSize: 14 }}>No notifications</div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {notifications.map((n, idx) => (
                <li
                  key={n.id}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f3f4f6',
                    background: n.read ? '#fff' : '#e6f7ff',
                    transition: 'background 0.2s',
                    cursor: n.read ? 'default' : 'pointer',
                    opacity: n.read ? 0.7 : 1,
                  }}
                  onClick={async () => {
                    if (n.read) return;
                    setNotifications((prev) => prev.map((x, i) => i === idx ? { ...x, read: true } : x));
                    const supabase = getBrowserSupabase();
                    await supabase.from('notifications').update({ read: true }).eq('id', n.id);
                  }}
                  title={n.read ? undefined : 'Mark as read'}
                >
                  <div style={{ fontWeight: n.read ? 500 : 700, color: '#111827' }}>{n.message}</div>
                  {n.url ? (
                    <a href={n.url} style={{ color: '#2563eb', textDecoration: 'underline', fontSize: 13 }} onClick={e => e.stopPropagation()}>
                      View
                    </a>
                  ) : null}
                  <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{new Date(n.created_at).toLocaleString()}</div>
                  {!n.read && (
                    <span style={{ marginLeft: 8, color: '#2563eb', fontSize: 11 }}>(Click to mark as read)</span>
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
