# Session Presence Detection and Idle Timeout

## Problem Statement

The Docker container runs continuous inference (thousands of OpenRouter API calls) even when no user has the browser open. This causes:

1. **Unnecessary API costs** - LLM calls running 24/7 without a player
2. **Resource waste** - CPU/memory consumed by idle simulation
3. **Rate limit risk** - Burning through API quotas

### Root Cause Analysis

The current architecture has several components involved in the simulation loop:

| Component | Location | Role |
| **Tick Scheduler** | `packages/workers/src/scheduler/index.ts` | BullMQ repeatable job every 1s |
| **Tick Processor** | `packages/workers/src/processors/tick.ts` | Emits TICK events to WorldBus |
| **Backend Services** | `packages/services/` | Physics, time, social simulation (runs on tick) |
| **NPC Actors** | `packages/actors/` | React to meaningful events (SPOKE, ARRIVED, etc.) |
| **Cognition Workers** | `packages/workers/src/processors/cognition.ts` | LLM inference (triggered by events, NOT ticks) |
| **Studio Endpoints** | `packages/api/src/routes/studio.ts` | Character conversation, trait inference |

**The core issue**: Once `startWorldTick(sessionId)` is called, it continues indefinitely until explicitly stopped. There's no mechanism to detect when users leave.

### Tick vs Inference Architecture

**Important distinction**: Ticks drive backend simulation, but they should NOT directly trigger LLM inference.

```text
┌─────────────────────────────────────────────────────────────────┐
│                        TICK EVENT                               │
│                    (fires every 1s)                             │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Backend Services                              │
│                                                                 │
│   ✅ Time progression (advance game clock)                      │
│   ✅ Physics updates (NPC movement, pathfinding)                │
│   ✅ Schedule checks (NPC daily routines)                       │
│   ✅ Ambient events (weather, day/night)                        │
│   ✅ Proximity detection (who's near player)                    │
│                                                                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │ May produce meaningful events
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Meaningful Events                             │
│                                                                 │
│   • ARRIVED (NPC entered player's location)                     │
│   • TIME_OF_DAY_CHANGED (morning → afternoon)                   │
│   • PROXIMITY_ALERT (NPC now close to player)                   │
│   • SCHEDULE_TRIGGERED (NPC's routine action)                   │
│                                                                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │ These can trigger inference
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   NPC Cognition (LLM)                           │
│                                                                 │
│   ❌ TICK alone → NO inference                                  │
│   ✅ SPOKE (player said something) → inference                  │
│   ✅ ARRIVED (NPC entered scene) → maybe greet                  │
│   ✅ TIME_OF_DAY_CHANGED → comment on time                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Current problem**: NPC actors treat TICK events as triggers for cognition, causing constant LLM calls even when nothing meaningful happened.

---

## Solution Overview

Implement a **heartbeat-based presence system** with a simple rule:

> **The world runs as long as a player is observing it.**

The session chat component sends a heartbeat every 60 seconds. If no heartbeat is received for 5 minutes, the session pauses.

```text
┌─────────────────────────────────────────────────────────────────┐
│                   ChatPanel Component                           │
│                                                                 │
│   useEffect(() => {                                             │
│     // Send heartbeat every 60s while mounted                   │
│     const interval = setInterval(sendHeartbeat, 60_000);        │
│     sendHeartbeat(); // Initial                                 │
│     return () => clearInterval(interval);                       │
│   }, [sessionId]);                                              │
│                                                                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │ POST /sessions/:id/heartbeat
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Presence Service                             │
│                                                                 │
│   Session → { lastHeartbeat: Date }                             │
│                                                                 │
│   On heartbeat:                                                 │
│     1. Update lastHeartbeat timestamp                           │
│     2. If session was paused → resume tick scheduler            │
│                                                                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Heartbeat Monitor (checks every 30s)               │
│                                                                 │
│   for each session:                                             │
│     if (now - lastHeartbeat > 5 minutes):                       │
│       scheduler.stopWorldTick(sessionId)                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Heartbeat ONLY from session chat page** - Other pages (library, settings, etc.) do NOT send heartbeats
2. **World keeps running while observing** - No "idle" state based on user activity; just watching is enough
3. **Simple binary state** - Session is either running (has recent heartbeat) or paused (no heartbeat for 5 min)
4. **Auto-resume on return** - When user navigates back to session, heartbeat resumes the tick scheduler

---

## Detailed Design

### 1. Client-Side Heartbeat (ChatPanel Only)

The heartbeat hook runs **inside the ChatPanel component**, not at the app level. This ensures:

- Heartbeat only fires when viewing the session chat
- Navigating to other pages stops the heartbeat
- Closing the tab/browser stops the heartbeat

```typescript
// packages/web/src/hooks/useSessionHeartbeat.ts

const HEARTBEAT_INTERVAL_MS = 60_000; // 60 seconds

export function useSessionHeartbeat(sessionId: string | null | undefined) {
  useEffect(() => {
    if (!sessionId) return;

    const sendHeartbeat = async () => {
      try {
        await fetch(`/api/sessions/${sessionId}/heartbeat`, { method: 'POST' });
      } catch (err) {
        console.warn('[Heartbeat] Failed:', err);
      }
    };

    // Send immediately on mount
    sendHeartbeat();

    // Then every 60 seconds
    const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [sessionId]);
}
```

**Integration in ChatPanel:**

```typescript
// packages/web/src/features/chat-panel/ChatPanel.tsx

export const ChatPanel: React.FC<ChatPanelProps> = ({ sessionId }) => {
  // ... existing state ...

  // Heartbeat to keep session alive while viewing
  useSessionHeartbeat(sessionId);

  // ... rest of component ...
};
```

### 2. Heartbeat API Endpoint

```typescript
// packages/api/src/routes/presence.ts

import { Hono } from 'hono';
import { presenceService } from '../services/presence-service.js';

const router = new Hono();

router.post('/sessions/:sessionId/heartbeat', async (c) => {
  const sessionId = c.req.param('sessionId');

  const result = await presenceService.recordHeartbeat(sessionId);

  return c.json({
    ok: true,
    sessionId,
    status: result.status,        // 'running' | 'resumed'
    lastHeartbeat: result.lastHeartbeat,
  });
});

export default router;
```

### 3. Presence Service

```typescript
// packages/services/src/presence/presence-service.ts

interface SessionHeartbeat {
  sessionId: string;
  lastHeartbeat: Date;
}

class PresenceService {
  private sessions = new Map<string, SessionHeartbeat>();
  private scheduler: Scheduler | null = null;

  setScheduler(scheduler: Scheduler) {
    this.scheduler = scheduler;
  }

  async recordHeartbeat(sessionId: string): Promise<{ status: string; lastHeartbeat: Date }> {
    const now = new Date();
    const existing = this.sessions.get(sessionId);

    this.sessions.set(sessionId, {
      sessionId,
      lastHeartbeat: now,
    });

    // Check if session was paused and needs resuming
    let status = 'running';
    if (this.scheduler) {
      const wasInactive = !existing ||
        (now.getTime() - existing.lastHeartbeat.getTime() > PAUSE_THRESHOLD_MS);

      if (wasInactive) {
        await this.scheduler.startWorldTick(sessionId);
        status = 'resumed';
        console.log(`[Presence] Session ${sessionId} resumed via heartbeat`);
      }
    }

    return { status, lastHeartbeat: now };
  }

  getLastHeartbeat(sessionId: string): Date | null {
    return this.sessions.get(sessionId)?.lastHeartbeat ?? null;
  }

  getSessions(): Map<string, SessionHeartbeat> {
    return this.sessions;
  }
}

export const presenceService = new PresenceService();
```

### 4. Heartbeat Monitor

Runs in the workers package, checking every 30 seconds for stale sessions:

```typescript
// packages/workers/src/heartbeat-monitor.ts

const CHECK_INTERVAL_MS = 30_000;    // Check every 30 seconds
const PAUSE_THRESHOLD_MS = 5 * 60 * 1000;  // 5 minutes

export class HeartbeatMonitor {
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(
    private presenceService: PresenceService,
    private scheduler: Scheduler
  ) {}

  start() {
    console.log('[HeartbeatMonitor] Starting...');
    this.checkInterval = setInterval(() => this.check(), CHECK_INTERVAL_MS);
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private async check() {
    const now = Date.now();

    for (const [sessionId, data] of this.presenceService.getSessions()) {
      const msSinceHeartbeat = now - data.lastHeartbeat.getTime();

      if (msSinceHeartbeat > PAUSE_THRESHOLD_MS) {
        console.log(
          `[HeartbeatMonitor] Session ${sessionId} has no heartbeat for ` +
          `${Math.round(msSinceHeartbeat / 60000)}min, pausing...`
        );
        await this.scheduler.stopWorldTick(sessionId);
        // Remove from tracked sessions (will be re-added on next heartbeat)
        this.presenceService.getSessions().delete(sessionId);
      }
    }
  }
}
```

### 5. Database Persistence (Optional)

For multi-server deployments or to survive restarts, persist heartbeats to the database:

```typescript
// packages/db/src/schema/index.ts

export const sessions = pgTable('sessions', {
  // ... existing fields ...
  lastHeartbeatAt: timestamp('last_heartbeat_at', { withTimezone: true }),
});
```

```sql
-- Migration
ALTER TABLE sessions ADD COLUMN last_heartbeat_at TIMESTAMPTZ;
```

The presence service can then sync with the database:

```typescript
// On heartbeat
await db.update(sessions)
  .set({ lastHeartbeatAt: new Date() })
  .where(eq(sessions.id, sessionId));

// On server startup - pause any sessions without recent heartbeat
const staleSessions = await db.select()
  .from(sessions)
  .where(
    or(
      isNull(sessions.lastHeartbeatAt),
      lt(sessions.lastHeartbeatAt, new Date(Date.now() - PAUSE_THRESHOLD_MS))
    )
  );
// Don't start tick scheduler for these sessions
```

---

## Configuration

```bash
# Environment variables
SESSION_HEARTBEAT_INTERVAL_MS=60000    # Client sends every 60s
SESSION_HEARTBEAT_CHECK_MS=30000       # Server checks every 30s
SESSION_PAUSE_THRESHOLD_MS=300000      # Pause after 5 min (300s) no heartbeat
```

---

## Implementation Checklist

### Phase 1: Client Heartbeat

- [ ] Create `packages/web/src/hooks/useSessionHeartbeat.ts`
- [ ] Add `useSessionHeartbeat(sessionId)` call to `ChatPanel.tsx`
- [ ] Add heartbeat endpoint to API routes

### Phase 2: Backend Presence Service

- [ ] Create `packages/services/src/presence/presence-service.ts`
- [ ] Create `packages/workers/src/heartbeat-monitor.ts`
- [ ] Wire up HeartbeatMonitor in workers startup

### Phase 3: Scheduler Integration

- [ ] Ensure `Scheduler.stopWorldTick()` properly removes repeatable jobs
- [ ] Add resume logic to heartbeat handler
- [ ] Test pause/resume cycle

### Phase 4: Database Persistence (Optional)

- [ ] Add `last_heartbeat_at` migration
- [ ] Persist heartbeats to database
- [ ] Handle server restart (don't auto-start stale sessions)

### Phase 5: Testing & Monitoring

- [ ] Unit tests for presence service
- [ ] Integration test: heartbeat → pause → resume flow
- [ ] Add logging for pause/resume events
- [ ] (Optional) Metrics dashboard

---

## Quick Win: Immediate Mitigation

Before implementing the full solution, add a guard in the tick processor:

```typescript
// packages/workers/src/processors/tick.ts

const lastActivity = new Date(session.updatedAt);
const inactiveMinutes = (Date.now() - lastActivity.getTime()) / 60000;

if (inactiveMinutes > 30) {
  console.log(`[Tick] Session ${sessionId} inactive for ${inactiveMinutes.toFixed(0)}min, skipping`);
  return { success: true, eventsEmitted: 0, skipped: true };
}
```

---

## Expected Outcomes

1. **API Cost Reduction**: ~95% reduction in inference calls when no user viewing
2. **World Keeps Running**: As long as browser has session chat open, world simulates normally
3. **Seamless Resume**: Navigate back to session → heartbeat fires → world resumes
4. **No False Pauses**: Only pauses when user actually leaves (closes tab, navigates away)

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| User opens session in 2 tabs | Both send heartbeats; session stays running |
| User switches to another app | Heartbeat continues (browser tab still open) |
| User closes browser | No more heartbeats; pauses after 5 min |
| User navigates to Library page | Heartbeat stops (not in ChatPanel); pauses after 5 min |
| Server restarts | Sessions without recent heartbeat don't auto-start ticks |
| Network blip | Heartbeat fails silently; retries on next interval |
