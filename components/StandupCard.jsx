'use client';

import { useState } from 'react';

export default function StandupCard({ standup }) {
  const {
    user_name = 'Engineering Member',
    user_role = 'Developer',
    avatar,
    media_url,
    transcript,
    summary = {},
    created_at = new Date().toISOString(),
    likes: initialLikes = 0,
    comments: initialComments = []
  } = standup;

  const [likes, setLikes] = useState(initialLikes);
  const [hasLiked, setHasLiked] = useState(false);
  const [comments, setComments] = useState(initialComments);
  const [newComment, setNewComment] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);

  const hasBlocker = summary.blockers && summary.blockers !== 'None reported.' && summary.blockers !== 'None';

  const fetchComments = async () => {
    if (!standup.id) return;
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/comments/${standup.id}`);
      const data = await res.json();
      if (data.success && data.comments) {
        setComments(data.comments.map(c => ({
          id: c.id,
          author: c.author_name || c.author || 'Team Member',
          text: c.text,
          time: c.created_at ? new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'
        })));
      }
    } catch (err) {
      console.warn('Failed to fetch comments:', err.message);
    } finally {
      setLoadingComments(false);
    }
  };

  const toggleComments = () => {
    if (!showComments) {
      fetchComments();
    }
    setShowComments(!showComments);
  };

  const handleLike = () => {
    if (!hasLiked) {
      setLikes(likes + 1);
      setHasLiked(true);
    } else {
      setLikes(likes - 1);
      setHasLiked(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const commentText = newComment.trim();
    setNewComment('');

    const tempComment = {
      id: Date.now(),
      author: 'You',
      text: commentText,
      time: 'Just now'
    };
    setComments(prev => [...prev, tempComment]);

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          standup_id: standup.id,
          comment_text: commentText
        })
      });
      const data = await res.json();
      if (data.success && data.comment) {
        setComments(prev => prev.map(c => c.id === tempComment.id ? {
          id: data.comment.id,
          author: data.comment.author_name || 'You',
          text: data.comment.text,
          time: 'Just now'
        } : c));
      }
    } catch (err) {
      console.error('Failed to post comment:', err);
    }
  };

  const formattedDate = new Date(created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="card" style={{ marginBottom: '1.25rem', background: '#0a0a0a', border: '1px solid var(--border-color)' }}>
      {/* Header Info */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <img
            src={avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user_name)}`}
            alt={user_name}
            style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#171717', border: '1px solid var(--border-color)' }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: '700', fontSize: '1rem', color: '#fff' }}>{user_name}</span>
              <span style={{ fontSize: '0.75rem', background: '#171717', color: 'var(--text-muted)', padding: '0.15rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                {user_role}
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.1rem' }}>
              Submitted today at {formattedDate}
            </div>
          </div>
        </div>

        <span className="badge" style={{
          background: hasBlocker ? '#ffffff' : '#171717',
          color: hasBlocker ? '#000000' : '#ffffff',
          border: '1px solid #ffffff'
        }}>
          {hasBlocker ? '🚨 Blocker' : '✓ Clear'}
        </span>
      </div>

      {media_url && (
        <div style={{ marginBottom: '1rem', background: '#000000', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span>🔊 Voice Note</span>
          </div>
          <audio controls src={media_url} style={{ width: '100%', height: '36px' }} />
        </div>
      )}

      <div style={{ display: 'grid', gap: '0.65rem' }}>
        {summary.status && (
          <div className="summary-box">
            <div className="summary-label">✅ Completed</div>
            <p style={{ fontSize: '0.9rem', color: '#ffffff' }}>{summary.status}</p>
          </div>
        )}

        {summary.blockers && (
          <div className="summary-box blocker">
            <div className="summary-label">🚨 Blocker</div>
            <p style={{ fontSize: '0.9rem', color: '#ffffff' }}>
              {summary.blockers}
            </p>
          </div>
        )}

        {summary.next_steps && (
          <div className="summary-box next">
            <div className="summary-label">🚀 Next Steps</div>
            <p style={{ fontSize: '0.9rem', color: '#ffffff' }}>{summary.next_steps}</p>
          </div>
        )}

        {summary.decisions && summary.decisions !== 'No major architectural decisions reported today.' && (
          <div className="summary-box">
            <div className="summary-label">💡 Key Decisions</div>
            <p style={{ fontSize: '0.9rem', color: '#ffffff' }}>{summary.decisions}</p>
          </div>
        )}
      </div>

      {transcript && (
        <details style={{ marginTop: '0.75rem', cursor: 'pointer' }}>
          <summary style={{ fontSize: '0.8rem', color: 'var(--text-muted)', userSelect: 'none' }}>
            📄 View Full Audio Transcript
          </summary>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.5rem', padding: '0.5rem', background: '#000000', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
            "{transcript}"
          </p>
        </details>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleLike}
            style={{
              background: hasLiked ? '#ffffff' : 'transparent',
              border: '1px solid #ffffff',
              color: hasLiked ? '#000000' : '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.25rem 0.6rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.78rem'
            }}
          >
            <span>👏</span>
            <span>{likes}</span>
          </button>

          <button
            onClick={toggleComments}
            style={{
              background: showComments ? '#171717' : 'transparent',
              border: '1px solid var(--border-color)',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.25rem 0.6rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.78rem'
            }}
          >
            <span>💬</span>
            <span>{comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}</span>
          </button>
        </div>

        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
          Async Verified
        </span>
      </div>

      {showComments && (
        <div style={{ marginTop: '1rem', background: '#000000', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          {loadingComments ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Loading comments...</p>
          ) : comments.length > 0 ? (
            <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '0.75rem' }}>
              {comments.map((c) => (
                <div key={c.id} style={{ fontSize: '0.85rem', background: '#0a0a0a', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    <span style={{ fontWeight: '600', color: '#ffffff' }}>{c.author}</span>
                    <span>{c.time}</span>
                  </div>
                  <p style={{ marginTop: '0.2rem', color: '#fff' }}>{c.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>No comments yet.</p>
          )}

          <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              className="input-field"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              style={{ fontSize: '0.85rem', padding: '0.4rem 0.6rem' }}
            />
            <button type="submit" className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
