'use client';

export default function StatsOverview({ totalMembers = 7, submittedCount = 5, blockerCount = 1 }) {
  const completionRate = Math.round((submittedCount / totalMembers) * 100);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#0a0a0a', border: '1px solid var(--border-color)' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: '#171717', color: '#ffffff', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
          📈
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Submission Rate</div>
          <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#fff' }}>{completionRate}% <span style={{ fontSize: '0.8rem', fontWeight: '400', color: 'var(--text-muted)' }}>({submittedCount}/{totalMembers})</span></div>
        </div>
      </div>

      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#0a0a0a', border: '1px solid var(--border-color)' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: '#171717', color: '#ffffff', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
          🚨
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Blockers</div>
          <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#ffffff' }}>
            {blockerCount} {blockerCount === 1 ? 'Issue' : 'Issues'}
          </div>
        </div>
      </div>

      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#0a0a0a', border: '1px solid var(--border-color)' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: '#171717', color: '#ffffff', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
          🔥
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Team Streak</div>
          <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#fff' }}>14 Days</div>
        </div>
      </div>

      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#0a0a0a', border: '1px solid var(--border-color)' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: '#171717', color: '#ffffff', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
          ⏱️
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Duration</div>
          <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#fff' }}>45s <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/ update</span></div>
        </div>
      </div>
    </div>
  );
}
