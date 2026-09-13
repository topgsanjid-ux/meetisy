'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function Navbar({ currentRole = 'member', onRoleChange }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          if (onRoleChange && data.user.role) {
            onRoleChange(data.user.role);
          }
        }
      } catch (_) {
      } finally {
        setLoadingUser(false);
      }
    }
    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      router.push('/login');
      router.refresh();
    } catch (_) {}
  };

  const navItems = [
    { label: 'Dashboard', href: '/', icon: '📊' },
    { label: 'Standup Archive', href: '/history', icon: '📁' },
    { label: 'Team Directory', href: '/team', icon: '👥' },
    { label: 'AI Digest & Email', href: '/digest', icon: '⚡' },
  ];

  return (
    <header className="navbar">
      <div className="nav-brand">
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
          <span style={{ fontSize: '1.4rem', color: '#ffffff', fontWeight: '800', letterSpacing: '-0.02em' }}>
            mvp_PRO
          </span>
          <span className="nav-logo-badge">PRO</span>
        </Link>
      </div>

      <nav className="nav-links">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#0a0a0a', padding: '0.3rem 0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <img
                src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.name)}`}
                alt={user.name}
                style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#171717' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#fff', lineHeight: 1.2 }}>{user.name}</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{user.user_role || user.role}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#0a0a0a', padding: '0.35rem 0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <select
                value={user.role || currentRole}
                onChange={(e) => {
                  const newRole = e.target.value;
                  setUser({ ...user, role: newRole });
                  if (onRoleChange) onRoleChange(newRole);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  fontWeight: '600',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="member" style={{ background: '#000000', color: '#fff' }}>🧑‍💻 Member</option>
                <option value="manager" style={{ background: '#000000', color: '#fff' }}>👑 Lead / Manager</option>
              </select>
            </div>

            <button
              onClick={handleLogout}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
              title="Sign Out"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Link
              href="/login"
              className="btn btn-primary"
              style={{ fontSize: '0.85rem', padding: '0.4rem 0.9rem' }}
            >
              🔐 Sign In
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
