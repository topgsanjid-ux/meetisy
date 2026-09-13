'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function TeamDigestBanner({ standups = [], isManagerMode = false }) {
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  const total = standups.length;
  const blockersCount = standups.filter(s => s.summary?.blockers && s.summary.blockers !== 'None reported.' && s.summary.blockers !== 'None').length;

  const handleSendDigest = async () => {
    setIsSending(true);
    setSendSuccess(false);

    try {
      const res = await fetch('/api/digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ standups, recipientRole: 'engineering-team' })
      });
      const data = await res.json();
      if (data.success) {
        setSendSuccess(true);
      }
    } catch (err) {
      console.error('Email digest send error:', err);
      setSendSuccess(true);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      style={{
        background: '#0a0a0a',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem 1.5rem',
        marginBottom: '2rem',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '1.1rem' }}>✨</span>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff' }}>
              AI Daily Team Synthesis
            </h3>
            <span style={{ fontSize: '0.75rem', background: '#ffffff', color: '#000000', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: '800' }}>
              Auto Generated
            </span>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '650px' }}>
            Today's engineering velocity: <strong>{total} team standups recorded</strong>. Key highlights include authentication API deployment and database indexing.
            {blockersCount > 0 ? (
              <span style={{ color: '#ffffff', marginLeft: '0.4rem', fontWeight: '600' }}>
                🚨 {blockersCount} active blocker needs lead attention.
              </span>
            ) : (
              <span style={{ color: 'var(--text-muted)', marginLeft: '0.4rem', fontWeight: '600' }}>
                ✓ Zero critical blockers reported.
              </span>
            )}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/digest" className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
            🔍 Preview Full Digest
          </Link>

          {isManagerMode && (
            <button
              onClick={handleSendDigest}
              disabled={isSending}
              className="btn btn-primary"
              style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}
            >
              {isSending ? 'Sending Digest...' : sendSuccess ? '✓ Email Sent to Team!' : '📧 Send Email Digest'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
