'use client';
import { useState, useEffect } from 'react';

export default function IntegrationsModal({ isOpen, onClose }) {
  const [slackUrl, setSlackUrl] = useState('');
  const [teamsUrl, setTeamsUrl] = useState('');
  const [active, setActive] = useState(true);
  const [statusMsg, setStatusMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/integrations/webhooks')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.config) {
            setSlackUrl(data.config.slack_webhook_url || '');
            setTeamsUrl(data.config.teams_webhook_url || '');
            setActive(data.config.is_active !== undefined ? data.config.is_active : true);
          }
        })
        .catch(err => console.warn('Failed to load webhook config:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);

    try {
      const res = await fetch('/api/integrations/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_config',
          slack_webhook_url: slackUrl,
          teams_webhook_url: teamsUrl,
          is_active: active
        })
      });

      const json = await res.json();
      if (json.success) {
        setStatusMsg({ type: 'success', text: 'Integrations saved successfully!' });
      } else {
        setStatusMsg({ type: 'error', text: json.error || 'Failed to save integrations.' });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (type) => {
    setTesting(true);
    setStatusMsg(null);

    try {
      const res = await fetch('/api/integrations/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_webhook',
          type,
          url: type === 'slack' ? slackUrl : teamsUrl
        })
      });

      const json = await res.json();
      if (json.success) {
        setStatusMsg({ type: 'success', text: json.message });
      } else {
        setStatusMsg({ type: 'error', text: json.message || json.error });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)'
    }}>
      <div style={{
        background: '#0a0a0a',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        maxWidth: '540px',
        width: '100%',
        padding: '1.75rem',
        boxShadow: 'var(--shadow-card)',
        position: 'relative'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '1.25rem',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>

        <div style={{ marginBottom: '0.25rem' }}>
          <span style={{
            fontSize: '0.7rem',
            fontWeight: '700',
            padding: '0.15rem 0.5rem',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.1)',
            color: '#ffffff',
            border: '1px solid var(--border-color)',
            textTransform: 'uppercase'
          }}>
            Roadmap Integrations
          </span>
        </div>

        <h2 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#ffffff', marginBottom: '1rem' }}>
          🔌 Enterprise Integrations & Webhooks
        </h2>

        {statusMsg && (
          <div style={{
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            borderRadius: '8px',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            border: statusMsg.type === 'success' ? '1px solid #059669' : '1px solid #dc2626',
            background: statusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            color: statusMsg.type === 'success' ? '#34d399' : '#f87171'
          }}>
            <span>{statusMsg.type === 'success' ? '✅' : '❌'}</span>
            <span>{statusMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem' }}>
          {/* Slack Webhook */}
          <div>
            <label style={{ display: 'block', color: 'var(--text-main)', fontWeight: '600', marginBottom: '0.35rem' }}>
              Slack Incoming Webhook URL
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="url"
                value={slackUrl}
                onChange={e => setSlackUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                style={{
                  flex: 1,
                  background: '#000000',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '0.6rem 0.8rem',
                  color: '#ffffff',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem'
                }}
              />
              <button
                type="button"
                onClick={() => handleTest('slack')}
                disabled={testing}
                style={{
                  padding: '0.6rem 0.9rem',
                  borderRadius: '8px',
                  background: '#171717',
                  border: '1px solid var(--border-color)',
                  color: '#ffffff',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '0.75rem'
                }}
              >
                Test Slack
              </button>
            </div>
          </div>

          {/* Teams Webhook */}
          <div>
            <label style={{ display: 'block', color: 'var(--text-main)', fontWeight: '600', marginBottom: '0.35rem' }}>
              Microsoft Teams Webhook URL
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="url"
                value={teamsUrl}
                onChange={e => setTeamsUrl(e.target.value)}
                placeholder="https://outlook.office.com/webhook/..."
                style={{
                  flex: 1,
                  background: '#000000',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '0.6rem 0.8rem',
                  color: '#ffffff',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem'
                }}
              />
              <button
                type="button"
                onClick={() => handleTest('teams')}
                disabled={testing}
                style={{
                  padding: '0.6rem 0.9rem',
                  borderRadius: '8px',
                  background: '#171717',
                  border: '1px solid var(--border-color)',
                  color: '#ffffff',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '0.75rem'
                }}
              >
                Test Teams
              </button>
            </div>
          </div>

          {/* Model Context Protocol (MCP) Server */}
          <div style={{
            padding: '0.85rem 1rem',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: '700', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                🤖 Model Context Protocol (MCP) Server
              </span>
              <span style={{ fontSize: '0.65rem', color: '#a78bfa', background: 'rgba(167, 139, 250, 0.2)', padding: '0.15rem 0.4rem', borderRadius: '4px', fontFamily: 'monospace' }}>
                JSON-RPC 2.0
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.35rem' }}>
              Connect Cursor, Claude Desktop, or Copilot Workspace to query standup summaries and blocker queues via endpoint: <code style={{ color: '#ffffff', fontFamily: 'monospace' }}>/api/mcp</code>
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: '8px',
                background: '#171717',
                border: '1px solid var(--border-color)',
                color: 'var(--text-muted)',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: '8px',
                background: '#ffffff',
                border: 'none',
                color: '#000000',
                fontWeight: '800',
                cursor: 'pointer'
              }}
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
