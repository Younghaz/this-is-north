'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getBrowserSupabase } from '@/lib/supabase-browser';

type Notification = {
  id: number;
  type: string;
  message: string;
  url: string | null;
  read: boolean;
  created_at: string;
};

export default function NotificationBell() {
  const supabase = getBrowserSupabase();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;
      const { data } = await supabase
        .from('notifications')
        .select('id, type, message, url, read, created_at')
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setNotifications(data || []);
      setLoading(false);
    }
    load();

    // Optional: subscribe for realtime updates
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  function unreadCount() {
    return notifications.filter((n) => !n.read).length;
  }

  function markAllRead() {
    const ids = notifications.filter((n) => !n.read).map((n) => n.id);
    if (ids.length) {
      supabase.from('notifications').update({ read: true }).in('id', ids);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        aria-label="Notifications"
        onClick={() => { setShow((v) => !v); if (!show) markAllRead(); }}
        style={{
          background: 'none',
          border: 'none',
          position: 'relative',
          cursor: 'pointer',
          fontSize: 22,
        }}
      >
        🛎️
        {unreadCount() > 0 ? (
          <span style={{
            position: 'absolute',
            top: 0,
            right: 0,
            background: 'red',
            color: 'white',
            borderRadius: '50%',
            padding: '0 6px',
            fontSize: 12,
            minWidth: 20,
            textAlign: 'center',
          }}>
            {unreadCount()}
          </span>
        ) : null}
      </button>
      {show ? (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 32,
            width: 320,
            maxHeight: 400,
            background: 'white',
            border: '1px solid #ccc',
            borderRadius: 8,
            boxShadow: '0 2px 16px rgba(0,0,0,0.15)',
            zIndex: 100,
            overflowY: 'auto'
          }}
        >
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #eee', fontWeight: 600 }}>
            Notifications
          </div>
          {loading ? <div style={{ padding: 16 }}>Loading…</div> : null}
          {notifications.length === 0 ? <div style={{ padding: 16 }}>No notifications</div> : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {notifications.map((n) => (
                <li key={n.id} style={{ padding: '12px 16px', borderBottom: '1px solid #f4f4f4', background: n.read ? '#fff' : '#e6f7ff' }}>
                  <div style={{ fontWeight: n.read ? 500 : 700 }}>{n.message}</div>
                  {n.url ? (
                    <Link href={n.url} style={{ color: '#2563eb', textDecoration: 'underline', fontSize: 13 }}>
                      View
                    </Link>
                  ) : null}
                  <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{new Date(n.created_at).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
