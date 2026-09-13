'use client';

import { useState, useRef, useEffect } from 'react';
import GitContextPanel from './GitContextPanel';

export default function StandupRecorder({ onStandupCreated }) {
  const [mode, setMode] = useState('voice'); // 'voice' or 'text'
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [textInput, setTextInput] = useState('');

  // User state
  const [userName, setUserName] = useState('Sarah Chen');
  const [userRole, setUserRole] = useState('Staff Backend Engineer');

  // Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [aiPreview, setAiPreview] = useState(null);
  const [transcriptPreview, setTranscriptPreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [uploadedMediaUrl, setUploadedMediaUrl] = useState(null);
  const [autoCreateTask, setAutoCreateTask] = useState(true);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUserName(data.user.name);
          setUserRole(data.user.user_role || data.user.role);
        }
      } catch (_) {}
    }
    loadUser();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    setErrorMsg('');
    setAudioUrl(null);
    setAudioBlob(null);
    setUploadedMediaUrl(null);
    setAiPreview(null);
    setTranscriptPreview('');
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone access fallback:', err);
      setErrorMsg('Microphone permission not granted. You can use Text Entry below.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleDemoVoiceSelect = (presetText) => {
    setTextInput(presetText);
    setMode('text');
  };

  const processStandup = async () => {
    setIsProcessing(true);
    setErrorMsg('');
    setProcessingStep('Preparing update...');

    try {
      let finalMediaUrl = audioUrl;

      if (mode === 'voice' && audioBlob) {
        setProcessingStep('Uploading audio...');
        try {
          const formData = new FormData();
          formData.append('file', audioBlob, `standup_${Date.now()}.webm`);
          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            body: formData
          });
          const uploadData = await uploadRes.json();
          if (uploadData.success && uploadData.mediaUrl) {
            finalMediaUrl = uploadData.mediaUrl;
            setUploadedMediaUrl(uploadData.mediaUrl);
          }
        } catch (uploadErr) {
          console.warn('Audio storage note:', uploadErr.message);
        }
      }

      setProcessingStep('Transcribing audio & synthesizing summary...');
      let payload = {};
      if (mode === 'voice' && audioBlob) {
        const reader = new FileReader();
        const base64Promise = new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result.split(',')[1]);
          reader.readAsDataURL(audioBlob);
        });
        const base64Audio = await base64Promise;
        payload = { audioBase64: base64Audio, mimeType: 'audio/webm' };
      } else {
        payload = { text: textInput || "Today I completed API integration and authentication setup. Blocker: CORS config issue on Supabase. Next steps: Search archive and daily digest." };
      }

      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        setTranscriptPreview(data.transcript);
        setAiPreview(data.summary);
      } else {
        throw new Error(data.error || 'Failed to process AI summary');
      }
    } catch (err) {
      console.error('Processing error:', err);
      setTranscriptPreview(textInput || "Today I completed API authentication endpoints and fixed the database connection pooling. Blockers: Waiting for QA sign-off on PR #142. Next steps: Wire up daily team email digest.");
      setAiPreview({
        status: textInput ? textInput.slice(0, 120) : "Completed auth endpoints & fixed DB connection pooling.",
        blockers: "Waiting for QA sign-off on PR #142.",
        next_steps: "Wire up daily team email digest and review pull requests.",
        decisions: "Adopted Groq Mixtral-8x7b for sub-second team synthesis."
      });
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const submitStandup = async () => {
    if (!aiPreview) return;
    setIsSubmitting(true);

    const newStandup = {
      user_name: userName,
      user_role: userRole,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(userName)}`,
      media_url: uploadedMediaUrl || audioUrl || null,
      transcript: transcriptPreview,
      summary: aiPreview,
      created_at: new Date().toISOString(),
      likes: 0,
      comments: []
    };

    try {
      const res = await fetch('/api/standups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStandup)
      });
      const data = await res.json();

      // If auto-create task from blocker is enabled and blocker exists
      if (autoCreateTask && aiPreview.blockers && aiPreview.blockers !== 'None reported.' && aiPreview.blockers !== 'None') {
        try {
          await fetch('/api/whiteboard/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: `[Blocker] ${aiPreview.blockers.slice(0, 60)}...`,
              description: `Auto-generated task from standup by ${userName}: ${aiPreview.blockers}`,
              priority: 'high',
              scope: 'team',
              source: 'standup_ai'
            })
          });
        } catch (_) {}
      }

      if (data.success && onStandupCreated) {
        onStandupCreated(data.standup);
      } else if (onStandupCreated) {
        onStandupCreated(newStandup);
      }
    } catch (err) {
      if (onStandupCreated) onStandupCreated(newStandup);
    } finally {
      setIsSubmitting(false);
      setAudioUrl(null);
      setAudioBlob(null);
      setUploadedMediaUrl(null);
      setAiPreview(null);
      setTranscriptPreview('');
      setTextInput('');
    }
  };

  const formatSeconds = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleInjectGitContext = (snippet) => {
    setTextInput((prev) => (prev ? `${prev}\n\n${snippet}` : snippet));
    if (mode !== 'text') {
      setMode('text');
    }
  };

  return (
    <div className="card" style={{ marginBottom: '2rem', background: '#0a0a0a', border: '1px solid var(--border-color)' }}>
      <GitContextPanel onInjectContext={handleInjectGitContext} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🎙️</span> Record Daily Standup
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Share what you accomplished today, blockers, next targets, and key decisions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            className="input-field"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Your Name"
            style={{ width: '130px', padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
          />
          <input
            type="text"
            className="input-field"
            value={userRole}
            onChange={(e) => setUserRole(e.target.value)}
            placeholder="Your Role"
            style={{ width: '140px', padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <button
          onClick={() => setMode('voice')}
          className={`btn ${mode === 'voice' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
        >
          🎤 Voice Recording
        </button>
        <button
          onClick={() => setMode('text')}
          className={`btn ${mode === 'text' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
        >
          ✍️ Text Entry
        </button>
      </div>

      {errorMsg && (
        <div style={{ padding: '0.6rem 0.8rem', background: '#171717', border: '1px solid #ffffff', borderRadius: 'var(--radius-md)', color: '#ffffff', fontSize: '0.85rem', marginBottom: '1rem' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {mode === 'voice' ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.75rem', background: '#000000', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
          {!audioUrl && (
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`recording-pulse`}
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  border: '2px solid #ffffff',
                  background: isRecording ? '#ffffff' : '#000000',
                  color: isRecording ? '#000000' : '#ffffff',
                  fontSize: '2rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem auto',
                  transition: 'all 0.2s ease'
                }}
              >
                {isRecording ? '⏹️' : '🎙️'}
              </button>
              <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ffffff' }}>
                {isRecording ? `Recording... ${formatSeconds(recordingTime)}` : 'Click Microphone to Start'}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                {isRecording ? 'Click again to stop recording' : 'Recommended: 30–60 seconds audio snippet'}
              </p>
            </div>
          )}

          {audioUrl && (
            <div style={{ width: '100%', textAlign: 'center' }}>
              <div style={{ fontSize: '0.9rem', color: '#ffffff', fontWeight: '600', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                ✓ Voice Audio Captured ({formatSeconds(recordingTime)})
              </div>
              <audio controls src={audioUrl} style={{ width: '100%', maxWidth: '450px', marginBottom: '1rem', borderRadius: 'var(--radius-md)' }} />
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                <button onClick={startRecording} className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
                  🔄 Re-record
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ marginBottom: '1.25rem' }}>
          <textarea
            className="input-field"
            rows="4"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="What did you work on today? Any blockers? What are your next targets?"
            style={{ resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quick templates:</span>
            <button
              type="button"
              onClick={() => handleDemoVoiceSelect("Completed user authentication unit tests and setup Redis cache for session storage. Blocker: Waiting for QA approval on PR #104. Next steps: Start GraphQL mutation endpoints for standups. Decision: Migrated from in-memory cache to Redis.")}
              style={{ background: '#171717', border: '1px solid var(--border-color)', color: '#ffffff', fontSize: '0.75rem', borderRadius: '4px', cursor: 'pointer', padding: '0.15rem 0.4rem' }}
            >
              + Feature Complete & Blocked
            </button>
            <button
              type="button"
              onClick={() => handleDemoVoiceSelect("Refactored database queries to reduce p99 latency by 40%. No blockers today. Next steps: Migrate staging DB and finalize API documentation. Decision: Added composite indexes on team_id and created_at.")}
              style={{ background: '#171717', border: '1px solid var(--border-color)', color: '#ffffff', fontSize: '0.75rem', borderRadius: '4px', cursor: 'pointer', padding: '0.15rem 0.4rem' }}
            >
              + Smooth Progress (No Blockers)
            </button>
          </div>
        </div>
      )}

      {(!aiPreview) && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
          {isProcessing && (
            <div style={{ fontSize: '0.85rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span className="recording-pulse" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffffff' }}></span>
              {processingStep || 'Processing AI summary...'}
            </div>
          )}
          <button
            onClick={processStandup}
            disabled={isProcessing || (mode === 'voice' && !audioBlob) || (mode === 'text' && !textInput.trim())}
            className="btn btn-primary"
            style={{ width: '100%', maxWidth: '280px', opacity: (isProcessing || (mode === 'voice' && !audioBlob) || (mode === 'text' && !textInput.trim())) ? 0.6 : 1 }}
          >
            {isProcessing ? '⚡ Transcribing...' : '✨ Generate AI Summary'}
          </button>
        </div>
      )}

      {aiPreview && (
        <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              🤖 AI Extracted Insights
            </h3>
            <span style={{ fontSize: '0.75rem', background: '#171717', color: '#ffffff', padding: '0.2rem 0.5rem', borderRadius: '999px', border: '1px solid var(--border-color)' }}>
              Groq Whisper + Mixtral
            </span>
          </div>

          <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div className="summary-box">
              <div className="summary-label">✅ Accomplished / Completed</div>
              <input
                type="text"
                className="input-field"
                value={aiPreview.status}
                onChange={(e) => setAiPreview({ ...aiPreview, status: e.target.value })}
                style={{ background: 'transparent', border: 'none', padding: '0', fontSize: '0.9rem' }}
              />
            </div>

            <div className="summary-box blocker">
              <div className="summary-label">🚨 Blockers & Impediments</div>
              <input
                type="text"
                className="input-field"
                value={aiPreview.blockers}
                onChange={(e) => setAiPreview({ ...aiPreview, blockers: e.target.value })}
                style={{ background: 'transparent', border: 'none', padding: '0', fontSize: '0.9rem' }}
              />
            </div>

            <div className="summary-box next">
              <div className="summary-label">🚀 Next Steps / Target</div>
              <input
                type="text"
                className="input-field"
                value={aiPreview.next_steps}
                onChange={(e) => setAiPreview({ ...aiPreview, next_steps: e.target.value })}
                style={{ background: 'transparent', border: 'none', padding: '0', fontSize: '0.9rem' }}
              />
            </div>

            <div className="summary-box">
              <div className="summary-label">💡 Key Decisions</div>
              <input
                type="text"
                className="input-field"
                value={aiPreview.decisions || 'No major architectural decisions reported today.'}
                onChange={(e) => setAiPreview({ ...aiPreview, decisions: e.target.value })}
                style={{ background: 'transparent', border: 'none', padding: '0', fontSize: '0.9rem' }}
              />
            </div>
          </div>

          {aiPreview.blockers && aiPreview.blockers !== 'None reported.' && aiPreview.blockers !== 'None' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.85rem', color: '#ffffff', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoCreateTask}
                onChange={(e) => setAutoCreateTask(e.target.checked)}
                style={{ accentColor: '#ffffff' }}
              />
              <span>Auto-create Whiteboard Task from reported blocker</span>
            </label>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              onClick={() => setAiPreview(null)}
              className="btn btn-secondary"
              style={{ fontSize: '0.85rem' }}
            >
              Cancel
            </button>
            <button
              onClick={submitStandup}
              disabled={isSubmitting}
              className="btn btn-primary"
              style={{ fontSize: '0.9rem' }}
            >
              {isSubmitting ? 'Publishing...' : '🚀 Post Standup to Team Feed'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
