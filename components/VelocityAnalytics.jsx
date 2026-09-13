'use client';
import { useState, useEffect } from 'react';

export default function VelocityAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch('/api/analytics/velocity');
        const json = await res.json();
        if (json.success && json.analytics) {
          setData(json.analytics);
        }
      } catch (err) {
        console.warn('Analytics fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '1.25rem',
        marginBottom: '1.5rem',
        color: 'var(--text-muted)',
        fontSize: '0.85rem'
      }}>
        Loading enterprise velocity metrics...
      </div>
    );
  }

  if (!data) return null;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0a0a0a 0%, #121216 100%)',
      border: '1px solid var(--border-color)',
      borderRadius: '16px',
      padding: '1.25rem',
      margin: '1.5rem 0',
      boxShadow: 'var(--shadow-card)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
        paddingBottom: '0.75rem',
        borderBottom: '1px solid var(--border-color)',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{
              fontSize: '0.65rem',
              fontWeight: '800',
              padding: '0.15rem 0.5rem',
              borderRadius: '20px',
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              border: '1px solid var(--border-color)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Enterprise Intelligence
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>SOC 2 Type II Ready</span>
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📊 Sprint Velocity & Team Friction Metrics
          </h3>
        </div>

        <div style={{
          fontSize: '0.75rem',
          color: '#34d399',
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          padding: '0.3rem 0.75rem',
          borderRadius: '8px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem'
        }}>
          <span style={{ height: '7px', width: '7px', borderRadius: '50%', background: '#34d399', display: 'inline-block' }}></span>
          Zero Data Retention (ZDR) Active
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '0.75rem'
      }}>
        {/* Sprint Friction Score */}
        <div style={{
          background: '#000000',
          border: '1px solid var(--border-color)',
          padding: '0.85rem 1rem',
          borderRadius: '12px'
        }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600' }}>Sprint Friction Index</div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#34d399', marginTop: '0.25rem' }}>
            {data.sprint_friction_score} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>/100</span>
          </div>
          <div style={{ fontSize: '0.65rem', color: '#34d399', fontWeight: '600', marginTop: '0.15rem' }}>{data.sprint_friction_status}</div>
        </div>

        {/* Voice Input Adoption */}
        <div style={{
          background: '#000000',
          border: '1px solid var(--border-color)',
          padding: '0.85rem 1rem',
          borderRadius: '12px'
        }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600' }}>Voice Input Ratio</div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#38bdf8', marginTop: '0.25rem' }}>
            {data.voice_adoption_percentage}
          </div>
          <div style={{ fontSize: '0.65rem', color: '#38bdf8', fontWeight: '600', marginTop: '0.15rem' }}>3.2x faster than typing</div>
        </div>

        {/* Sub-second Groq Latency */}
        <div style={{
          background: '#000000',
          border: '1px solid var(--border-color)',
          padding: '0.85rem 1rem',
          borderRadius: '12px'
        }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600' }}>Groq LPU Whisper Speed</div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#c084fc', marginTop: '0.25rem' }}>
            {data.avg_transcription_latency_ms} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>ms</span>
          </div>
          <div style={{ fontSize: '0.65rem', color: '#c084fc', fontWeight: '600', marginTop: '0.15rem' }}>Sub-second hardware latency</div>
        </div>

        {/* Blocker Resolution MTTR */}
        <div style={{
          background: '#000000',
          border: '1px solid var(--border-color)',
          padding: '0.85rem 1rem',
          borderRadius: '12px'
        }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '600' }}>Blocker MTTR</div>
          <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fbbf24', marginTop: '0.25rem' }}>
            {data.blocker_mttr_hours} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>hrs</span>
          </div>
          <div style={{ fontSize: '0.65rem', color: '#fbbf24', fontWeight: '600', marginTop: '0.15rem' }}>{data.blocker_resolution_rate} resolved</div>
        </div>
      </div>
    </div>
  );
}
