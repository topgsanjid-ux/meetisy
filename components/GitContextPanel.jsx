'use client';
import { useState, useEffect } from 'react';

export default function GitContextPanel({ onInjectContext }) {
  const [gitData, setGitData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [injected, setInjected] = useState(false);

  useEffect(() => {
    async function loadGitContext() {
      try {
        const res = await fetch('/api/integrations/git');
        const data = await res.json();
        if (data.success && data.git_context) {
          setGitData(data.git_context);
        }
      } catch (err) {
        console.warn('Failed to load git context:', err);
      } finally {
        setLoading(false);
      }
    }
    loadGitContext();
  }, []);

  const handleInject = () => {
    if (!gitData) return;

    let textSnippet = `Worked on ${gitData.repository}. `;
    if (gitData.pull_requests && gitData.pull_requests.length > 0) {
      const prTitles = gitData.pull_requests.map(p => `#${p.id} "${p.title}"`).join(' & ');
      textSnippet += `Active PRs: ${prTitles}. `;
    }
    if (gitData.commits && gitData.commits.length > 0) {
      textSnippet += `Recent commit: ${gitData.commits[0].message}.`;
    }

    onInjectContext(textSnippet);
    setInjected(true);
    setTimeout(() => setInjected(false), 3000);
  };

  if (loading) {
    return (
      <div style={{
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '0.75rem',
        background: 'rgba(255, 255, 255, 0.03)',
        padding: '0.6rem 0.8rem',
        borderRadius: '8px',
        border: '1px solid var(--border-color)'
      }}>
        <span>Fetching recent GitHub PRs & commit context...</span>
      </div>
    );
  }

  if (!gitData) return null;

  return (
    <div style={{
      marginBottom: '1rem',
      background: '#0d0d0d',
      border: '1px solid var(--border-color)',
      borderRadius: '12px',
      padding: '0.75rem 1rem',
      fontSize: '0.75rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ height: '8px', width: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
          <span style={{ fontWeight: '700', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>🐙</span> Git Context Auto-Enriched ({gitData.repository})
          </span>
        </div>
        <button
          type="button"
          onClick={handleInject}
          style={{
            padding: '0.3rem 0.65rem',
            borderRadius: '6px',
            fontWeight: '600',
            fontSize: '0.7rem',
            cursor: 'pointer',
            border: injected ? '1px solid #10b981' : '1px solid var(--border-color)',
            background: injected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
            color: injected ? '#34d399' : '#ffffff',
            transition: 'all 0.2s'
          }}
        >
          {injected ? '✓ Injected!' : '+ 1-Click Auto-Inject Context'}
        </button>
      </div>

      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {gitData.pull_requests && gitData.pull_requests.length > 0 && (
          <div>
            <span style={{ color: '#a78bfa', fontFamily: 'monospace', fontWeight: 'bold' }}>PR: </span>
            <span>#{gitData.pull_requests[0].id} {gitData.pull_requests[0].title}</span>
          </div>
        )}
        {gitData.commits && gitData.commits.length > 0 && (
          <div style={{ fontSize: '0.7rem' }}>
            <span style={{ color: '#71717a', fontFamily: 'monospace' }}>[{gitData.commits[0].sha}] </span>
            <span>{gitData.commits[0].message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
