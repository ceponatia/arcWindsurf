import React from 'react'
import type { SessionSummary } from '../types.js'

export interface SessionsPanelProps {
  sessions: SessionSummary[]
  loading?: boolean
  error?: string | null
  activeId?: string | null
  onSelect?: (id: string) => void
  onRetry?: () => void
}

export const SessionsPanel: React.FC<SessionsPanelProps> = ({ sessions, loading = false, error = null, activeId, onSelect, onRetry }) => {
  const has = sessions.length > 0
  return (
    <section className="panel panel-sessions">
      <h2 className="panel-title">Sessions</h2>
      <div className="panel-body">
        {loading && <p className="muted">Loading…</p>}
        {!loading && error && (
          <div>
            <p className="error">Failed to load: {error}</p>
            <button className="btn" onClick={onRetry}>Retry</button>
          </div>
        )}
        {!loading && !error && !has && <p className="muted">No sessions yet.</p>}
        {!loading && !error && has && (
          <ul className="list">
            {sessions.map((s) => {
              const isActive = s.id === activeId
              const characterLabel = s.characterName ?? s.characterId
              const settingLabel = s.settingName ?? s.settingId
              return (
                <li
                  key={s.id}
                  className={`list-item selectable${isActive ? ' selected' : ''}`}
                  onClick={() => onSelect?.(s.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect?.(s.id) }}
                >
                  <div className="item-title">{characterLabel}</div>
                  <div className="item-summary">{settingLabel}</div>
                  <div className="item-tags" style={{ fontSize: '11px' }}>{new Date(s.createdAt).toLocaleTimeString()}</div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
