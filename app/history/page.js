'use client';

import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import StandupCard from '../../components/StandupCard';

export default function HistoryPage() {
  const [role, setRole] = useState('member');
  const [standups, setStandups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('7-days');
  const [selectedMember, setSelectedMember] = useState('all');
  const [onlyBlockers, setOnlyBlockers] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/standups');
        const data = await res.json();
        if (data.success) {
          const archivedExtras = [
            {
              id: 'st-arch-1',
              user_name: 'David Kim',
              user_role: 'Security Engineer',
              avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=DavidKim',
              media_url: null,
              transcript: 'Completed annual penetration testing for API gateways and patched JWT token expiration vulnerability. No blockers today.',
              summary: {
                status: 'Completed annual API gateway pen-testing & patched JWT expiration flaw.',
                blockers: 'None reported.',
                next_steps: 'Deploy patch to production & update threat matrix docs.'
              },
              created_at: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
              likes: 5,
              comments: []
            },
            {
              id: 'st-arch-2',
              user_name: 'Elena Rostova',
              user_role: 'Data Engineer',
              avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=ElenaRostova',
              media_url: null,
              transcript: 'Built ETL pipeline in Apache Spark for real-time clickstream data. Blocker: Waiting for AWS Snowflake connector permissions.',
              summary: {
                status: 'Built Apache Spark ETL pipeline for real-time clickstream data.',
                blockers: 'Waiting for AWS Snowflake connector IAM role permissions.',
                next_steps: 'Benchmark pipeline throughput upon IAM approval.'
              },
              created_at: new Date(Date.now() - 1000 * 60 * 60 * 52).toISOString(),
              likes: 2,
              comments: []
            }
          ];
          setStandups([...data.standups, ...archivedExtras]);
        }
      } catch (err) {
        console.error('History fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const members = Array.from(new Set(standups.map((s) => s.user_name)));

  const filteredStandups = standups.filter((item) => {
    const textToMatch = `${item.user_name} ${item.user_role} ${item.transcript} ${item.summary?.status || ''} ${item.summary?.blockers || ''} ${item.summary?.next_steps || ''}`.toLowerCase();
    const matchesSearch = textToMatch.includes(search.toLowerCase());

    const matchesMember = selectedMember === 'all' || item.user_name === selectedMember;

    const hasBlocker = item.summary?.blockers && item.summary.blockers !== 'None reported.' && item.summary.blockers !== 'None';
    const matchesBlocker = onlyBlockers ? hasBlocker : true;

    return matchesSearch && matchesMember && matchesBlocker;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#000000', color: '#ffffff' }}>
      <Navbar currentRole={role} onRoleChange={setRole} />

      <main className="main-container">
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#fff' }}>
            📁 Standup Archive & Search
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Search historical voice transcripts, past engineering updates, and unresolved team blockers.
          </p>
        </div>

        <div className="card" style={{ marginBottom: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'center', background: '#0a0a0a', border: '1px solid var(--border-color)' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Search Keywords</label>
            <input
              type="text"
              className="input-field"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search features, PRs, blockers..."
              style={{ fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Team Member</label>
            <select
              className="select-field"
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            >
              <option value="all" style={{ background: '#000' }}>All Members ({members.length})</option>
              {members.map((m) => (
                <option key={m} value={m} style={{ background: '#000' }}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Time Range</label>
            <select
              className="select-field"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            >
              <option value="today" style={{ background: '#000' }}>Today</option>
              <option value="7-days" style={{ background: '#000' }}>Past 7 Days</option>
              <option value="30-days" style={{ background: '#000' }}>Past 30 Days</option>
              <option value="all" style={{ background: '#000' }}>All Time</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%' }}>
            <button
              onClick={() => setOnlyBlockers(!onlyBlockers)}
              className={`btn ${onlyBlockers ? 'btn-primary' : 'btn-secondary'}`}
              style={{ width: '100%', fontSize: '0.85rem', height: '42px' }}
            >
              🚨 {onlyBlockers ? 'Blockers Only' : 'Filter Blockers'}
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            ⚡ Searching archive records...
          </div>
        ) : filteredStandups.length > 0 ? (
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Found {filteredStandups.length} archived update{filteredStandups.length === 1 ? '' : 's'}
            </div>
            {filteredStandups.map((item) => (
              <StandupCard key={item.id} standup={item} />
            ))}
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)', background: '#0a0a0a' }}>
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>📂</span>
            <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '0.25rem' }}>No archived standups found</h3>
            <p style={{ fontSize: '0.85rem' }}>Try adjusting your search criteria or time range filters.</p>
          </div>
        )}
      </main>

      <footer style={{ borderTop: '1px solid var(--border-color)', padding: '1.5rem 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem', marginTop: 'auto', background: '#000000' }}>
        mvp_PRO ENGINE • Voice-First Daily Updates for Modern Remote Teams
      </footer>
    </div>
  );
}
