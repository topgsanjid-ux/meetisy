'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('member');
  const [userRole, setUserRole] = useState('Full-Stack Engineer');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const endpoint = tab === 'login' ? '/api/auth/login' : '/api/auth/signup';
      const payload = tab === 'login'
        ? { email, password }
        : { email, password, name, role, user_role: userRole };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Authentication failed');
      }

      setSuccessMsg(tab === 'login' ? 'Logged in! Redirecting...' : 'Account created! Redirecting...');
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoEmail) => {
    setEmail(demoEmail);
    setPassword('password123');
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: demoEmail, password: 'password123' })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Logged in as demo user! Redirecting...');
        setTimeout(() => {
          router.push('/');
          router.refresh();
        }, 400);
      } else {
        throw new Error(data.error || 'Demo login failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#000000', color: '#ffffff' }}>
      <header style={{ padding: '1.25rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
          <span style={{ fontSize: '1.4rem', color: '#ffffff', fontWeight: '800' }}>
            mvp_PRO
          </span>
          <span style={{ fontSize: '0.75rem', background: '#ffffff', color: '#000000', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: '800' }}>
            PRO
          </span>
        </Link>
        <Link href="/" className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
          ← Back to App
        </Link>
      </header>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
        <div style={{ width: '100%', maxWidth: '440px', background: '#0a0a0a', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '2rem', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.35rem' }}>
              {tab === 'login' ? 'Welcome Back' : 'Create Team Account'}
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {tab === 'login' ? 'Sign in to access team standups & digests' : 'Start async daily standups with automated AI synthesis'}
            </p>
          </div>

          <div style={{ display: 'flex', background: '#000000', borderRadius: '8px', padding: '4px', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
            <button
              onClick={() => { setTab('login'); setError(''); }}
              style={{
                flex: 1,
                padding: '0.5rem',
                border: 'none',
                borderRadius: '6px',
                background: tab === 'login' ? '#ffffff' : 'transparent',
                color: tab === 'login' ? '#000000' : '#ffffff',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => { setTab('signup'); setError(''); }}
              style={{
                flex: 1,
                padding: '0.5rem',
                border: 'none',
                borderRadius: '6px',
                background: tab === 'signup' ? '#ffffff' : 'transparent',
                color: tab === 'signup' ? '#000000' : '#ffffff',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Sign Up
            </button>
          </div>

          {error && (
            <div style={{ padding: '0.65rem 0.85rem', background: '#171717', border: '1px solid #ffffff', borderRadius: '8px', color: '#ffffff', fontSize: '0.85rem', marginBottom: '1rem' }}>
              ⚠️ {error}
            </div>
          )}

          {successMsg && (
            <div style={{ padding: '0.65rem 0.85rem', background: '#ffffff', color: '#000000', borderRadius: '8px', fontWeight: '600', fontSize: '0.85rem', marginBottom: '1rem' }}>
              ✓ {successMsg}
            </div>
          )}

          <form onSubmit={handleAuth} style={{ display: 'grid', gap: '0.9rem' }}>
            {tab === 'signup' && (
              <>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Full Name</label>
                  <input
                    type="text"
                    className="input-field"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Sarah Chen"
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Team Role</label>
                    <select
                      className="select-field"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      style={{ fontSize: '0.85rem' }}
                    >
                      <option value="member" style={{ background: '#000' }}>Team Member</option>
                      <option value="manager" style={{ background: '#000' }}>Tech Lead / Manager</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Job Title</label>
                    <input
                      type="text"
                      className="input-field"
                      value={userRole}
                      onChange={(e) => setUserRole(e.target.value)}
                      placeholder="e.g. Backend Dev"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Email Address</label>
              <input
                type="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@engineering.io"
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Password</label>
              <input
                type="password"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem', marginTop: '0.5rem' }}
            >
              {loading ? 'Authenticating...' : tab === 'login' ? '⚡ Sign In to Dashboard' : '🚀 Create Account'}
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '0.75rem' }}>
              ⚡ 1-Click Demo Accounts (Password: <code>password123</code>):
            </div>
            <div style={{ display: 'grid', gap: '0.4rem' }}>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('sarah.chen@engineering.io')}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem', justifyContent: 'flex-start' }}
              >
                <span>👩‍💻</span> Sarah Chen (Staff Backend Dev)
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('marcus.vance@engineering.io')}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem', justifyContent: 'flex-start' }}
              >
                <span>👑</span> Marcus Vance (Tech Lead / Manager)
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
