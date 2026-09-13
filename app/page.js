'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from '../components/Navbar';
import StandupRecorder from '../components/StandupRecorder';
import VelocityAnalytics from '../components/VelocityAnalytics';
import IntegrationsModal from '../components/IntegrationsModal';

function timeAgo(isoString) {
  if (!isoString) return 'Just now';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function SkeletonCard({ wide }) {
  return (
    <div className="momentum-skeleton" style={{ minWidth: wide ? '100%' : '260px' }}>
      <div className="skel-line skel-short" />
      <div className="skel-line skel-long" />
      <div className="skel-line skel-medium" />
    </div>
  );
}

/* ═══════════════════════════════════════════
   1. URGENT BLOCKER CARD WITH TASK CONVERSION
   ═══════════════════════════════════════════ */
function BlockerCard({ standup, index, onTaskCreated }) {
  const [status, setStatus] = useState('open'); // 'open' | 'working_on' | 'threaded'
  const [loadingAction, setLoadingAction] = useState(false);
  const [threadOpen, setThreadOpen] = useState(false);
  const [taskCreated, setTaskCreated] = useState(false);

  const handleUpdateStatus = async (newStatus) => {
    setLoadingAction(true);
    const targetStatus = status === newStatus ? 'open' : newStatus;
    setStatus(targetStatus);
    try {
      await fetch(`/api/blockers/${standup.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus })
      });
    } catch (err) {
      console.warn('Blocker status update note:', err);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleConvertToTask = async () => {
    if (taskCreated) return;
    setLoadingAction(true);
    try {
      const res = await fetch('/api/whiteboard/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `[Blocker] ${standup.summary?.blockers?.slice(0, 60)}...`,
          description: `Reported by ${standup.user_name} (${standup.user_role}): ${standup.summary?.blockers}`,
          priority: 'critical',
          scope: 'team',
          source: 'blocker_feed'
        })
      });
      const data = await res.json();
      if (data.success) {
        setTaskCreated(true);
        if (onTaskCreated) onTaskCreated(data.task);
      }
    } catch (err) {
      console.warn('Task conversion note:', err);
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div
      className="blocker-micro-card"
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      <div className="blocker-header">
        <div className="blocker-avatar-wrap">
          <img
            src={standup.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(standup.user_name)}`}
            alt={standup.user_name}
            className="blocker-avatar"
          />
        </div>

        <div className="blocker-meta">
          <span className="blocker-name">{standup.user_name}</span>
          <span className="blocker-role">{standup.user_role}</span>
        </div>

        <span className="blocker-time-badge">{timeAgo(standup.created_at)}</span>
      </div>

      <div className="blocker-body">
        <div className="blocker-severity-bar">
          <span className="blocker-severity-label">
            {status === 'working_on' ? 'WORKING ON' : status === 'threaded' ? 'THREADED' : 'BLOCKING'}
          </span>
        </div>
        <p className="blocker-text">{standup.summary?.blockers}</p>
      </div>

      {standup.summary?.status && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <strong>Context:</strong> {standup.summary.status}
        </div>
      )}

      <div className="blocker-actions">
        <button
          className={`blocker-react-btn ${status === 'working_on' ? 'reacted' : ''}`}
          onClick={() => handleUpdateStatus('working_on')}
          disabled={loadingAction}
        >
          {status === 'working_on' ? '🛠️ Working On' : '🤝 Offer Help'}
        </button>
        <button
          className={`blocker-thread-btn ${status === 'threaded' ? 'reacted' : ''}`}
          onClick={() => { setThreadOpen(!threadOpen); handleUpdateStatus('threaded'); }}
          disabled={loadingAction}
        >
          💬 {threadOpen ? 'Close' : 'Thread'}
        </button>
        <button
          className={`blocker-task-btn ${taskCreated ? 'reacted' : ''}`}
          onClick={handleConvertToTask}
          disabled={loadingAction || taskCreated}
          title="Create task on Whiteboard"
        >
          {taskCreated ? '✓ Task Created' : '📋 Create Task'}
        </button>
      </div>

      {threadOpen && (
        <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: '#000000', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <span style={{ color: '#ffffff', fontWeight: '600' }}>Blocker Thread:</span> Discussion initiated with {standup.user_name}.
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   2. AI VIDEO / AUDIO SNIPPET BUBBLE
   ═══════════════════════════════════════════ */
function VideoBubble({ standup, index, onSelect, isSelected }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef(null);
  const [progress, setProgress] = useState(0);

  const startFakePlayback = useCallback(() => {
    setIsPlaying(true);
    setProgress(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(intervalRef.current);
          setIsPlaying(false);
          return 0;
        }
        return prev + (100 / 30);
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const hasBlocker = standup.summary?.blockers && standup.summary.blockers !== 'None reported.' && standup.summary.blockers !== 'None';

  return (
    <div
      className={`video-bubble ${isSelected ? 'video-bubble-selected' : ''}`}
      style={{ animationDelay: `${index * 0.1}s` }}
      onClick={() => onSelect(standup.id)}
    >
      <svg className="video-ring-svg" viewBox="0 0 88 88">
        <circle className="video-ring-track" cx="44" cy="44" r="40" />
        <circle
          className="video-ring-progress"
          cx="44" cy="44" r="40"
          style={{
            strokeDasharray: `${2 * Math.PI * 40}`,
            strokeDashoffset: `${2 * Math.PI * 40 * (1 - progress / 100)}`,
            stroke: '#ffffff'
          }}
        />
      </svg>

      <div className="video-bubble-inner">
        <img
          src={standup.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(standup.user_name)}`}
          alt={standup.user_name}
          className="video-bubble-avatar"
        />
      </div>

      <span className="video-bubble-name">{standup.user_name.split(' ')[0]}</span>
      <span className="video-bubble-time">{timeAgo(standup.created_at)}</span>

      {isSelected && (
        <div className="video-expanded-panel" onClick={e => e.stopPropagation()}>
          <div className="video-expanded-header">
            <strong style={{ color: '#fff' }}>{standup.user_name}</strong>
            <span className="video-expanded-role">{standup.user_role}</span>
          </div>

          {standup.media_url ? (
            <audio controls src={standup.media_url} style={{ width: '100%', height: '32px', marginBottom: '0.5rem' }} />
          ) : (
            <button
              className={`btn ${isPlaying ? 'btn-secondary' : 'btn-primary'}`}
              style={{ width: '100%', fontSize: '0.78rem', padding: '0.35rem 0', marginBottom: '0.5rem' }}
              onClick={isPlaying ? () => { clearInterval(intervalRef.current); setIsPlaying(false); setProgress(0); } : startFakePlayback}
            >
              {isPlaying ? '⏹ Stop Playback' : '▶ Play 30s Snippet'}
            </button>
          )}

          <p className="video-expanded-transcript">
            "{standup.transcript ? standup.transcript.slice(0, 120) + '…' : 'Audio snippet available.'}"
          </p>

          {standup.summary?.status && (
            <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#ffffff' }}>
              <span>✅</span> {standup.summary.status}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   3. INSTANT CATCH-UP CARD
   ═══════════════════════════════════════════ */
function CatchUpCard({ standup, index }) {
  const [expanded, setExpanded] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(standup.likes || 0);

  const hasBlocker = standup.summary?.blockers && standup.summary.blockers !== 'None reported.' && standup.summary.blockers !== 'None';

  const handleLike = (e) => {
    e.stopPropagation();
    if (!liked) { setLikeCount(likeCount + 1); setLiked(true); }
    else { setLikeCount(likeCount - 1); setLiked(false); }
  };

  return (
    <div
      className="catchup-card"
      style={{ animationDelay: `${index * 0.06}s` }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="catchup-header">
        <div className="catchup-left">
          <img
            src={standup.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(standup.user_name)}`}
            alt={standup.user_name}
            className="catchup-avatar"
          />
          <div className="catchup-identity">
            <span className="catchup-name">{standup.user_name}</span>
            <span className="catchup-role">{standup.user_role}</span>
          </div>
        </div>

        <div className="catchup-right">
          <span className={`catchup-status-badge ${hasBlocker ? 'catchup-status-blocked' : 'catchup-status-clear'}`}>
            {hasBlocker ? '🚨 Blocker' : '✓ Clear'}
          </span>
          <span className="catchup-timestamp">{timeAgo(standup.created_at)}</span>
        </div>
      </div>

      <div className="catchup-summary-grid">
        {standup.summary?.status && (
          <div className="catchup-summary-pill">
            <span>✅</span>
            <span>{standup.summary.status}</span>
          </div>
        )}
        {standup.summary?.next_steps && (
          <div className="catchup-summary-pill">
            <span>🚀</span>
            <span>{standup.summary.next_steps}</span>
          </div>
        )}
        {hasBlocker && (
          <div className="catchup-summary-pill" style={{ border: '1px solid #ffffff' }}>
            <span>🚨</span>
            <span>{standup.summary.blockers}</span>
          </div>
        )}
        {standup.summary?.decisions && standup.summary.decisions !== 'No major architectural decisions reported today.' && (
          <div className="catchup-summary-pill">
            <span>💡</span>
            <span>{standup.summary.decisions}</span>
          </div>
        )}
      </div>

      {expanded && standup.transcript && (
        <div className="catchup-transcript-drawer">
          <div style={{ color: '#fff', fontWeight: '600', marginBottom: '0.25rem' }}>📄 Full Transcript</div>
          <p>"{standup.transcript}"</p>
        </div>
      )}

      <div className="catchup-footer">
        <button className="catchup-like-btn" onClick={handleLike}>
          <span>👏</span> {likeCount}
        </button>
        <button className="catchup-comment-btn" onClick={e => { e.stopPropagation(); setExpanded(!expanded); }}>
          💬 {(standup.comments || []).length}
        </button>
        <span className="catchup-expand-hint">{expanded ? 'Collapse ▲' : 'Expand ▼'}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN DASHBOARD
   ═══════════════════════════════════════════ */
export default function DailyMomentumDashboard() {
  const [role, setRole] = useState('member');
  const [standups, setStandups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeVideoId, setActiveVideoId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(false);
  const snippetScrollRef = useRef(null);

  useEffect(() => {
    fetchStandups();
  }, []);

  const fetchStandups = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/standups');
      const data = await res.json();
      if (data.success) {
        setStandups(data.standups);
      } else {
        throw new Error('Failed to load standups');
      }
    } catch (err) {
      console.error('Fetch standups error:', err);
      setError('Could not load team updates.');
    } finally {
      setLoading(false);
    }
  };

  const handleStandupCreated = (newStandup) => {
    setStandups((prev) => [newStandup, ...prev]);
  };

  const blockerStandups = standups.filter(
    s => s.summary?.blockers && s.summary.blockers !== 'None reported.' && s.summary.blockers !== 'None'
  );

  const clearStandups = standups.filter(
    s => !s.summary?.blockers || s.summary.blockers === 'None reported.' || s.summary.blockers === 'None'
  );

  const filteredCatchUp = standups.filter(item => {
    const matchesSearch = !searchQuery ||
      item.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.user_role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.summary?.status && item.summary.status.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.summary?.blockers && item.summary.blockers.toLowerCase().includes(searchQuery.toLowerCase()));

    if (activeTab === 'blockers') {
      return matchesSearch && blockerStandups.some(b => b.id === item.id);
    }
    if (activeTab === 'clear') {
      return matchesSearch && clearStandups.some(c => c.id === item.id);
    }
    return matchesSearch;
  });

  const submittedCount = standups.length;
  const totalMembers = 7;
  const completionPct = Math.round((submittedCount / totalMembers) * 100);

  const scrollSnippets = (direction) => {
    if (snippetScrollRef.current) {
      const scrollAmount = 200;
      snippetScrollRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="momentum-layout">
      <Navbar currentRole={role} onRoleChange={setRole} />

      <main className="momentum-main">
        {/* HERO HEADER */}
        <section className="momentum-hero">
          <div className="momentum-hero-text">
            <h1 className="momentum-title">
              <span className="momentum-title-accent">DAILY</span> MOMENTUM
            </h1>
            <p className="momentum-subtitle">
              Engineering Team Alpha • {todayStr}
            </p>
          </div>

          <div className="momentum-hero-stats">
            <div className="momentum-stat-orb">
              <span className="momentum-stat-value">{completionPct}%</span>
              <span className="momentum-stat-label">Submitted</span>
              <svg className="momentum-stat-ring" viewBox="0 0 60 60">
                <circle cx="30" cy="30" r="26" className="stat-ring-track" />
                <circle
                  cx="30" cy="30" r="26"
                  className="stat-ring-fill"
                  style={{
                    strokeDasharray: `${2 * Math.PI * 26}`,
                    strokeDashoffset: `${2 * Math.PI * 26 * (1 - completionPct / 100)}`
                  }}
                />
              </svg>
            </div>

            <div className="momentum-stat-chip">
              <span className="stat-chip-icon">🚨</span>
              <span className="stat-chip-count">{blockerStandups.length}</span>
              <span className="stat-chip-label">Blockers</span>
            </div>

            <div className="momentum-stat-chip">
              <span className="stat-chip-icon">🔥</span>
              <span className="stat-chip-count">14</span>
              <span className="stat-chip-label">Day Streak</span>
            </div>

            <div className="momentum-stat-chip">
              <span className="stat-chip-icon">⚡</span>
              <span className="stat-chip-count">{submittedCount}/{totalMembers}</span>
              <span className="stat-chip-label">Reported</span>
            </div>

            <button
              onClick={() => setIsIntegrationsOpen(true)}
              style={{
                background: 'rgba(147, 51, 234, 0.2)',
                border: '1px solid rgba(168, 85, 247, 0.4)',
                color: '#e9d5ff',
                padding: '0.5rem 0.85rem',
                borderRadius: '0.75rem',
                fontSize: '0.75rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.2s'
              }}
            >
              <span>🔌</span> Webhooks & MCP API
            </button>
          </div>
        </section>

        {/* ENTERPRISE VELOCITY & FRICTION ANALYTICS */}
        <VelocityAnalytics />

        {/* INTEGRATIONS & WEBHOOKS MODAL */}
        <IntegrationsModal isOpen={isIntegrationsOpen} onClose={() => setIsIntegrationsOpen(false)} />

        {/* STANDUP RECORDER */}
        <StandupRecorder onStandupCreated={handleStandupCreated} />

        {loading && (
          <div className="momentum-loading-grid" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <SkeletonCard wide />
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
        )}

        {error && !loading && (
          <div style={{ padding: '1rem', background: '#0a0a0a', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
            <span>⚠️ {error}</span>
            <button className="btn btn-secondary" onClick={fetchStandups} style={{ fontSize: '0.8rem' }}>Retry</button>
          </div>
        )}

        {/* SECTION 1: URGENT BLOCKERS */}
        {!loading && blockerStandups.length > 0 && (
          <section className="momentum-section">
            <div className="section-header-row">
              <div className="section-title-group">
                <span className="section-glow-dot" />
                <h2 className="section-title">Urgent Blockers</h2>
                <span className="section-count-badge">{blockerStandups.length}</span>
              </div>
              <span className="section-hint">Requires immediate action</span>
            </div>

            <div className="blocker-grid">
              {blockerStandups.map((s, i) => (
                <BlockerCard key={s.id} standup={s} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* SECTION 2: AI STANDUP SNIPPETS */}
        {!loading && standups.length > 0 && (
          <section className="momentum-section">
            <div className="section-header-row">
              <div className="section-title-group">
                <span className="section-glow-dot" />
                <h2 className="section-title">AI Audio Snippets</h2>
                <span className="section-count-badge">{standups.length}</span>
              </div>
              <div className="snippet-nav-arrows">
                <button className="snippet-arrow-btn" onClick={() => scrollSnippets('left')}>◀</button>
                <button className="snippet-arrow-btn" onClick={() => scrollSnippets('right')}>▶</button>
              </div>
            </div>

            <div className="video-snippets-scroll" ref={snippetScrollRef}>
              {standups.map((s, i) => (
                <VideoBubble
                  key={s.id}
                  standup={s}
                  index={i}
                  isSelected={activeVideoId === s.id}
                  onSelect={(id) => setActiveVideoId(activeVideoId === id ? null : id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* SECTION 3: INSTANT CATCH-UP */}
        {!loading && standups.length > 0 && (
          <section className="momentum-section">
            <div className="section-header-row">
              <div className="section-title-group">
                <span className="section-glow-dot" />
                <h2 className="section-title">Instant Catch-Up Feed</h2>
                <span className="section-count-badge">{filteredCatchUp.length}</span>
              </div>

              <div className="catchup-controls">
                <div className="catchup-tab-group">
                  {[
                    { key: 'all', label: 'All', icon: '📋' },
                    { key: 'blockers', label: 'Blocked', icon: '🚨' },
                    { key: 'clear', label: 'On Track', icon: '✅' }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      className={`catchup-tab ${activeTab === tab.key ? 'catchup-tab-active' : ''}`}
                      onClick={() => setActiveTab(tab.key)}
                    >
                      {tab.icon} {tab.label}
                    </button>
                  ))}
                </div>

                <div className="catchup-search-wrap">
                  <span className="catchup-search-icon">🔍</span>
                  <input
                    type="text"
                    className="catchup-search-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search updates…"
                  />
                </div>
              </div>
            </div>

            <div className="catchup-feed">
              {filteredCatchUp.length > 0 ? (
                filteredCatchUp.map((s, i) => (
                  <CatchUpCard key={s.id} standup={s} index={i} />
                ))
              ) : (
                <div className="momentum-empty-state">
                  <h3>No matching updates found</h3>
                  <p>Try adjusting your search criteria.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {!loading && !error && standups.length === 0 && (
          <div className="momentum-empty-state">
            <h2>No standups posted today</h2>
            <p>Use the recorder above to post your team update.</p>
          </div>
        )}
      </main>

      <footer className="momentum-footer">
        <span>mvp_PRO ENGINE</span>
        <span className="footer-separator">•</span>
        <span>Minimalist Voice-First Updates for High-Velocity Remote Teams</span>
      </footer>
    </div>
  );
}
