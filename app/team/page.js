'use client';

import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';

export default function TeamPage() {
  const [role, setRole] = useState('manager');
  const [currentUserId, setCurrentUserId] = useState('usr-1');
  const [members, setMembers] = useState([
    { id: 'usr-1', name: 'Sarah Chen', role: 'Staff Backend Engineer', timezone: 'America/New_York (UTC-4)', status: 'submitted', streak: 18, email: 'sarah.chen@engineering.io' },
    { id: 'usr-2', name: 'Marcus Vance', role: 'Tech Lead', timezone: 'America/Los_Angeles (UTC-7)', status: 'submitted', streak: 24, email: 'marcus.vance@engineering.io' },
    { id: 'usr-3', name: 'Priya Patel', role: 'DevOps Lead', timezone: 'Europe/London (UTC+1)', status: 'submitted', streak: 12, email: 'priya.patel@engineering.io' },
    { id: 'usr-4', name: 'Alex Rivera', role: 'Frontend Engineer', timezone: 'America/Chicago (UTC-5)', status: 'pending', streak: 7, email: 'alex.rivera@engineering.io' }
  ]);

  const [teamName, setTeamName] = useState('Engineering Team Alpha');
  const [teamTimezone, setTeamTimezone] = useState('America/New_York');
  const [editingTeam, setEditingTeam] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const [automationTime, setAutomationTime] = useState('10:00');
  const [automationWebhook, setAutomationWebhook] = useState('https://hooks.slack.com/services/...');
  const [savingAutomation, setSavingAutomation] = useState(false);

  const [whiteboardTab, setWhiteboardTab] = useState('team');
  const [whiteboardTasks, setWhiteboardTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  const [showAddTask, setShowAddTask] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [newScope, setNewScope] = useState('team');
  const [newAssignee, setNewAssignee] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newNotes, setNewNotes] = useState('');

  useEffect(() => {
    fetchWhiteboardTasks();
  }, [whiteboardTab, currentUserId]);

  const showNotification = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleNudgeMember = async (member) => {
    try {
      const res = await fetch('/api/nudge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_emails: [member.email],
          message: `Hey ${member.name}! Please remember to submit your daily standup update for ${teamName}.`
        })
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`🔔 Nudge email sent to ${member.name} (${member.email})`);
      } else {
        showNotification(`⚠️ Nudge failed: ${data.error}`);
      }
    } catch (err) {
      showNotification(`🔔 Nudge simulated for ${member.name}`);
    }
  };

  const handleSaveTeamSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/teams/11111111-1111-1111-1111-111111111111', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: teamName, timezone: teamTimezone })
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`⚙️ Team settings updated successfully!`);
        setEditingTeam(false);
      } else {
        showNotification(`⚠️ ${data.error}`);
      }
    } catch (err) {
      showNotification(`⚙️ Saved team settings locally.`);
      setEditingTeam(false);
    }
  };

  const handleSaveAutomation = async () => {
    setSavingAutomation(true);
    try {
      const [hour, minute] = automationTime.split(':');
      const cronExpr = `${minute || 0} ${hour || 10} * * 1-5`;

      const res = await fetch('/api/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rule_type: 'standup_reminder',
          cron_expression: cronExpr,
          recipient_emails: members.map(m => m.email),
          message_template: `Daily Standup Reminder: Please submit your update by ${automationTime}!`
        })
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`⏰ Automation rule saved! Cron schedule: ${cronExpr}`);
      } else {
        showNotification(`⚠️ ${data.error}`);
      }
    } catch (err) {
      showNotification(`⏰ Automation rule saved locally!`);
    } finally {
      setSavingAutomation(false);
    }
  };

  const fetchWhiteboardTasks = async () => {
    setLoadingTasks(true);
    try {
      const url = whiteboardTab === 'personal'
        ? `/api/whiteboard/tasks?scope=personal&user_id=${currentUserId}`
        : `/api/whiteboard/tasks?scope=team`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.tasks) {
        setWhiteboardTasks(data.tasks);
      }
    } catch (err) {
      console.warn('Whiteboard fetch failed:', err);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const res = await fetch('/api/whiteboard/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDesc.trim() || null,
          priority: newPriority,
          scope: newScope,
          user_id: currentUserId,
          assigned_to: newScope === 'personal' ? currentUserId : (newAssignee || null),
          due_date: newDueDate || null,
          notes: newNotes.trim() || null,
          source: 'manual'
        })
      });
      const data = await res.json();
      if (data.success && data.task) {
        setWhiteboardTasks(prev => [data.task, ...prev]);
        setNewTitle('');
        setNewDesc('');
        setNewDueDate('');
        setNewNotes('');
        setShowAddTask(false);
        showNotification(`📋 Task "${data.task.title}" created on ${newScope === 'personal' ? 'Individual' : 'Team'} Board!`);
      }
    } catch (err) {
      showNotification(`⚠️ Failed to create task.`);
    }
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    setWhiteboardTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    try {
      await fetch(`/api/whiteboard/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (err) {
      console.warn('Failed to update task status:', err);
    }
  };

  const handleToggleTaskScope = async (task) => {
    const targetScope = task.scope === 'personal' ? 'team' : 'personal';
    setWhiteboardTasks(prev => prev.filter(t => t.id !== task.id));
    try {
      const res = await fetch(`/api/whiteboard/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: targetScope })
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`🔀 Moved task "${task.title}" to ${targetScope === 'personal' ? 'Individual' : 'Team'} Board!`);
      }
    } catch (err) {
      showNotification(`⚠️ Failed to move task.`);
    }
  };

  const handleDeleteTask = async (taskId) => {
    setWhiteboardTasks(prev => prev.filter(t => t.id !== taskId));
    try {
      await fetch(`/api/whiteboard/tasks/${taskId}`, { method: 'DELETE' });
      showNotification(`🗑️ Task deleted.`);
    } catch (err) {
      console.warn('Failed to delete task:', err);
    }
  };

  const currentUserObj = members.find(m => m.id === currentUserId) || members[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#000000', color: '#ffffff' }}>
      <Navbar currentRole={role} onRoleChange={setRole} />

      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          background: '#0a0a0a',
          border: '1px solid #ffffff',
          color: '#ffffff',
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-card)',
          fontSize: '0.9rem',
          fontWeight: '600'
        }}>
          {toastMessage}
        </div>
      )}

      <main className="main-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#fff' }}>
              👥 Team Roster & Settings
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Manage {teamName} members, timezones, and automated daily standup workflows.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Active Persona:</span>
            <select
              className="select-field"
              value={currentUserId}
              onChange={e => setCurrentUserId(e.target.value)}
              style={{ fontSize: '0.85rem', padding: '0.3rem 0.6rem' }}
            >
              {members.map(m => (
                <option key={m.id} value={m.id} style={{ background: '#000' }}>{m.name} ({m.role.split(' ')[0]})</option>
              ))}
            </select>

            <button
              onClick={() => setEditingTeam(!editingTeam)}
              className="btn btn-secondary"
              style={{ fontSize: '0.85rem' }}
            >
              ⚙️ Team Settings
            </button>
          </div>
        </div>

        {editingTeam && (
          <div className="card" style={{ marginBottom: '2rem', border: '1px solid #ffffff', background: '#0a0a0a' }}>
            <h3 style={{ fontSize: '1rem', color: '#fff', marginBottom: '1rem' }}>Update Team Settings</h3>
            <form onSubmit={handleSaveTeamSettings} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Team Name</label>
                <input
                  type="text"
                  className="input-field"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Primary Timezone</label>
                <select
                  className="select-field"
                  value={teamTimezone}
                  onChange={(e) => setTeamTimezone(e.target.value)}
                >
                  <option value="America/New_York" style={{ background: '#000' }}>America/New_York (UTC-4)</option>
                  <option value="America/Los_Angeles" style={{ background: '#000' }}>America/Los_Angeles (UTC-7)</option>
                  <option value="Europe/London" style={{ background: '#000' }}>Europe/London (UTC+1)</option>
                  <option value="Asia/Tokyo" style={{ background: '#000' }}>Asia/Tokyo (UTC+9)</option>
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingTeam(false)} style={{ fontSize: '0.85rem' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ fontSize: '0.85rem' }}>Save Settings</button>
              </div>
            </form>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
          {members.map((m) => (
            <div key={m.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#0a0a0a', border: '1px solid var(--border-color)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <img
                      src={`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(m.name)}`}
                      alt={m.name}
                      style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#171717', border: '1px solid var(--border-color)' }}
                    />
                    <div>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#fff' }}>{m.name}</h3>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.role}</div>
                    </div>
                  </div>

                  <span className="badge" style={{
                    background: m.status === 'submitted' ? '#ffffff' : '#171717',
                    color: m.status === 'submitted' ? '#000000' : '#ffffff',
                    border: '1px solid #ffffff'
                  }}>
                    {m.status === 'submitted' ? '✓ Submitted' : '⏳ Pending'}
                  </span>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'grid', gap: '0.35rem', background: '#000000', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Timezone:</span>
                    <strong style={{ color: '#fff' }}>{m.timezone}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Streak:</span>
                    <strong style={{ color: '#ffffff' }}>🔥 {m.streak} Days</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Email:</span>
                    <span style={{ color: 'var(--text-dim)' }}>{m.email}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                <button
                  onClick={() => handleNudgeMember(m)}
                  className="btn btn-secondary"
                  style={{ flex: 1, fontSize: '0.75rem', padding: '0.35rem' }}
                >
                  🔔 Send Nudge
                </button>
                <button
                  onClick={() => setEditingTeam(true)}
                  className="btn btn-secondary"
                  style={{ flex: 1, fontSize: '0.75rem', padding: '0.35rem' }}
                >
                  ⚙️ Settings
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* COLLABORATIVE & INDIVIDUAL WHITEBOARD SECTION */}
        <section style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>🎨</span> Whiteboard Workspaces
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {whiteboardTab === 'team'
                  ? 'Central Hub: Team-wide blockers & tasks.'
                  : `Private Workspace: Personal planning & workload for ${currentUserObj.name}.`}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', background: '#0a0a0a', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <button
                  className={`btn ${whiteboardTab === 'team' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setWhiteboardTab('team')}
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem', border: 'none' }}
                >
                  🌐 Team Board
                </button>
                <button
                  className={`btn ${whiteboardTab === 'personal' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setWhiteboardTab('personal')}
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem', border: 'none' }}
                >
                  👤 My Board ({currentUserObj.name.split(' ')[0]})
                </button>
              </div>

              <button
                onClick={() => {
                  setNewScope(whiteboardTab);
                  setShowAddTask(!showAddTask);
                }}
                className="btn btn-primary"
                style={{ fontSize: '0.85rem' }}
              >
                {showAddTask ? 'Cancel' : `➕ Add Task`}
              </button>
            </div>
          </div>

          {showAddTask && (
            <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid #ffffff', background: '#0a0a0a' }}>
              <h3 style={{ fontSize: '0.95rem', color: '#fff', marginBottom: '0.75rem' }}>
                Create New {newScope === 'personal' ? 'Personal' : 'Team'} Task
              </h3>
              <form onSubmit={handleCreateTask} style={{ display: 'grid', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Task Title (e.g., Fix S3 CORS Bucket Policy)"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    style={{ flex: 1 }}
                    required
                  />
                  <select
                    className="select-field"
                    value={newScope}
                    onChange={e => setNewScope(e.target.value)}
                    style={{ width: '160px' }}
                  >
                    <option value="team" style={{ background: '#000' }}>🌐 Team Board</option>
                    <option value="personal" style={{ background: '#000' }}>👤 Personal Board</option>
                  </select>
                </div>

                <textarea
                  className="input-field"
                  placeholder="Task details and description..."
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  rows={2}
                />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Priority</label>
                    <select className="select-field" value={newPriority} onChange={e => setNewPriority(e.target.value)}>
                      <option value="low" style={{ background: '#000' }}>Low Priority</option>
                      <option value="medium" style={{ background: '#000' }}>Medium Priority</option>
                      <option value="high" style={{ background: '#000' }}>High Priority</option>
                      <option value="critical" style={{ background: '#000' }}>Critical Priority</option>
                    </select>
                  </div>

                  {newScope === 'team' ? (
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Assignee</label>
                      <select className="select-field" value={newAssignee} onChange={e => setNewAssignee(e.target.value)}>
                        <option value="" style={{ background: '#000' }}>AI Auto-Assign</option>
                        {members.map(m => (
                          <option key={m.id} value={m.id} style={{ background: '#000' }}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Target Deadline</label>
                      <input
                        type="date"
                        className="input-field"
                        value={newDueDate}
                        onChange={e => setNewDueDate(e.target.value)}
                      />
                    </div>
                  )}

                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Notes</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Check API docs..."
                      value={newNotes}
                      onChange={e => setNewNotes(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button type="submit" className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
                    Create & Sync Board
                  </button>
                </div>
              </form>
            </div>
          )}

          {loadingTasks ? (
            <p style={{ color: 'var(--text-muted)' }}>Loading whiteboard tasks...</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {['todo', 'in_progress', 'done'].map(colStatus => {
                const colTasks = whiteboardTasks.filter(t => t.status === colStatus);
                const colLabels = { todo: '📋 To Do', in_progress: '⚡ In Progress', done: '✅ Completed' };
                return (
                  <div key={colStatus} style={{ background: '#0a0a0a', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontWeight: '700', fontSize: '0.9rem', color: '#fff' }}>
                      <span>{colLabels[colStatus]}</span>
                      <span className="section-count-badge">{colTasks.length}</span>
                    </div>

                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                      {colTasks.length > 0 ? colTasks.map(t => {
                        const assignedMember = members.find(m => m.id === t.assigned_to);
                        const isPersonal = t.scope === 'personal';

                        return (
                          <div
                            key={t.id}
                            style={{
                              background: '#000000',
                              border: `1px solid ${isPersonal ? '#ffffff' : 'var(--border-color)'}`,
                              borderRadius: 'var(--radius-sm)',
                              padding: '0.75rem',
                              position: 'relative'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                              <strong style={{ fontSize: '0.85rem', color: '#fff' }}>{t.title}</strong>
                              <button
                                onClick={() => handleDeleteTask(t.id)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}
                                title="Delete task"
                              >
                                ✕
                              </button>
                            </div>

                            {t.description && (
                              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>{t.description}</p>
                            )}

                            {t.notes && (
                              <div style={{ fontSize: '0.7rem', color: '#ffffff', background: '#171717', border: '1px solid var(--border-color)', padding: '0.3rem 0.5rem', borderRadius: '4px', marginBottom: '0.4rem' }}>
                                📝 {t.notes}
                              </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', marginTop: '0.5rem', paddingTop: '0.4rem', borderTop: '1px solid var(--border-color)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span style={{
                                  color: '#ffffff',
                                  fontWeight: '700',
                                  textTransform: 'uppercase',
                                  fontSize: '0.65rem'
                                }}>
                                  ● {t.priority}
                                </span>

                                {assignedMember && (
                                  <span style={{ fontSize: '0.65rem', background: '#171717', color: '#ffffff', border: '1px solid var(--border-color)', padding: '0.1rem 0.4rem', borderRadius: '3px' }}>
                                    👤 {assignedMember.name.split(' ')[0]}
                                  </span>
                                )}
                              </div>

                              <button
                                onClick={() => handleToggleTaskScope(t)}
                                className="btn btn-secondary"
                                style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}
                              >
                                {isPersonal ? 'Move to Team 🌐' : 'Move Personal 👤'}
                              </button>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.3rem', marginTop: '0.4rem' }}>
                              {colStatus !== 'todo' && (
                                <button onClick={() => handleUpdateTaskStatus(t.id, colStatus === 'done' ? 'in_progress' : 'todo')} className="btn btn-secondary" style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}>
                                  ← Move
                                </button>
                              )}
                              {colStatus !== 'done' && (
                                <button onClick={() => handleUpdateTaskStatus(t.id, colStatus === 'todo' ? 'in_progress' : 'done')} className="btn btn-secondary" style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}>
                                  Move →
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      }) : (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textAlign: 'center', padding: '1rem 0' }}>No tasks</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* AUTOMATION RULES SETTINGS */}
        <div className="card" style={{ background: '#0a0a0a', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '1rem', color: '#fff', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>⏰</span> Daily Standup Reminder Automation
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Configure automated cron reminder schedules and Resend email dispatches.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Daily Deadline:</span>
              <input
                type="time"
                className="input-field"
                value={automationTime}
                onChange={e => setAutomationTime(e.target.value)}
                style={{ width: '130px', fontSize: '0.85rem', padding: '0.3rem 0.6rem' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Webhook:</span>
              <input
                type="text"
                className="input-field"
                value={automationWebhook}
                onChange={e => setAutomationWebhook(e.target.value)}
                style={{ width: '240px', fontSize: '0.85rem', padding: '0.3rem 0.6rem' }}
              />
            </div>

            <button
              onClick={handleSaveAutomation}
              disabled={savingAutomation}
              className="btn btn-primary"
              style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
            >
              {savingAutomation ? 'Saving...' : 'Save Automation Rules'}
            </button>
          </div>
        </div>
      </main>

      <footer style={{ borderTop: '1px solid var(--border-color)', padding: '1.5rem 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem', marginTop: 'auto', background: '#000000' }}>
        mvp_PRO ENGINE • Voice-First Daily Updates for Modern Remote Teams
      </footer>
    </div>
  );
}
