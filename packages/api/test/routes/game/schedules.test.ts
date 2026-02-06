import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const scheduleMocks = vi.hoisted(() => ({
  selectMock: vi.fn(),
  insertMock: vi.fn(),
  updateMock: vi.fn(),
  deleteMock: vi.fn(),
  getActorStateMock: vi.fn(),
  upsertActorStateMock: vi.fn(),
  eqMock: vi.fn(),
  andMock: vi.fn(),
}));

const scheduleTemplatesTable = { name: 'scheduleTemplates' };
const actorStatesTable = { name: 'actorStates' };

vi.mock('@minimal-rpg/db/node', () => ({
  drizzle: {
    select: scheduleMocks.selectMock,
    insert: scheduleMocks.insertMock,
    update: scheduleMocks.updateMock,
    delete: scheduleMocks.deleteMock,
  },
  scheduleTemplates: scheduleTemplatesTable,
  actorStates: actorStatesTable,
  eq: scheduleMocks.eqMock,
  and: scheduleMocks.andMock,
  getActorState: scheduleMocks.getActorStateMock,
  upsertActorState: scheduleMocks.upsertActorStateMock,
}));

interface ScheduleRoutesModule {
  registerScheduleRoutes: (app: Hono) => void;
}

const { registerScheduleRoutes } = (await import(
  '../../../src/routes/game/schedules.js'
)) as ScheduleRoutesModule;

const scheduleTemplate = {
  id: 'template-1',
  name: 'Morning',
  description: 'Morning routine',
  scheduleJson: {
    id: 'template-1',
    name: 'Morning',
    slots: [
      {
        id: 'slot-1',
        startTime: { hour: 8, minute: 0 },
        endTime: { hour: 9, minute: 0 },
        destination: { type: 'fixed', locationId: 'loc-1' },
        activity: { type: 'idle', description: 'rest', engagement: 'idle' },
      },
    ],
    defaultSlot: {
      destination: { type: 'fixed', locationId: 'loc-1' },
      activity: { type: 'idle', description: 'rest', engagement: 'idle' },
    },
    requiredPlaceholders: ['home'],
  },
  createdAt: new Date('2026-02-06T10:00:00.000Z'),
  updatedAt: new Date('2026-02-06T10:00:00.000Z'),
};

const npcSchedule = {
  id: 'schedule-1',
  name: 'Daily',
  slots: [
    {
      id: 'slot-1',
      startTime: { hour: 8, minute: 0 },
      endTime: { hour: 9, minute: 0 },
      destination: { type: 'fixed', locationId: 'loc-1' },
      activity: { type: 'idle', description: 'rest', engagement: 'idle' },
    },
  ],
  defaultSlot: {
    destination: { type: 'fixed', locationId: 'loc-1' },
    activity: { type: 'idle', description: 'rest', engagement: 'idle' },
  },
};

/**
 * Build a Hono app with schedule routes registered.
 */
function makeApp(): Hono {
  const app = new Hono();
  registerScheduleRoutes(app);
  return app;
}

describe('routes/game/schedules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists schedule templates', async () => {
    scheduleMocks.selectMock.mockReturnValue({
      from: () => Promise.resolve([scheduleTemplate]),
    });

    const app = makeApp();
    const res = await app.request('/schedule-templates');

    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; templates: { id: string }[] };
    expect(body.ok).toBe(true);
    expect(body.templates[0]?.id).toBe('template-1');
  });

  it('returns 404 when schedule template is missing', async () => {
    scheduleMocks.selectMock.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: () => [],
        }),
      }),
    });

    const app = makeApp();
    const res = await app.request('/schedule-templates/11111111-1111-4111-8111-111111111111');

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'Schedule template not found' });
  });

  it('creates a schedule template', async () => {
    scheduleMocks.insertMock.mockReturnValue({
      values: () => ({
        returning: () => [scheduleTemplate],
      }),
    });

    const app = makeApp();
    const res = await app.request('/schedule-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Morning',
        description: 'Morning routine',
        templateData: scheduleTemplate.scheduleJson,
        requiredPlaceholders: ['home'],
      }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { ok: boolean; template: { id: string } };
    expect(body.ok).toBe(true);
    expect(body.template.id).toBe('template-1');
  });

  it('returns 400 when schedule template data is invalid', async () => {
    const app = makeApp();
    const res = await app.request('/schedule-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bad',
        description: 'Bad',
        templateData: { id: 'bad' },
        requiredPlaceholders: ['home'],
      }),
    });

    expect(res.status).toBe(400);
  });

  it('updates a schedule template', async () => {
    scheduleMocks.updateMock.mockReturnValue({
      set: () => ({
        where: () => ({
          returning: () => [scheduleTemplate],
        }),
      }),
    });

    const app = makeApp();
    const res = await app.request('/schedule-templates/11111111-1111-4111-8111-111111111111', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated' }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; template: { id: string } };
    expect(body.ok).toBe(true);
    expect(body.template.id).toBe('template-1');
  });

  it('deletes a schedule template', async () => {
    scheduleMocks.deleteMock.mockReturnValue({
      where: () => undefined,
    });

    const app = makeApp();
    const res = await app.request('/schedule-templates/11111111-1111-4111-8111-111111111111', { method: 'DELETE' });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it('lists npc schedules for a session', async () => {
    scheduleMocks.selectMock.mockReturnValue({
      from: () => ({
        where: () => [
          {
            actorId: 'npc-1',
            state: { schedule: { scheduleData: npcSchedule } },
          },
        ],
      }),
    });

    const app = makeApp();
    const res = await app.request('/sessions/11111111-1111-4111-8111-111111111111/npc-schedules');

    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; schedules: { npcId: string }[] };
    expect(body.ok).toBe(true);
    expect(body.schedules[0]?.npcId).toBe('npc-1');
  });

  it('returns 404 when npc schedule is missing', async () => {
    scheduleMocks.getActorStateMock.mockResolvedValue(null);

    const app = makeApp();
    const res = await app.request(
      '/sessions/11111111-1111-4111-8111-111111111111/npc-schedules/npc-1'
    );

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'NPC schedule not found' });
  });

  it('creates npc schedule when actor exists', async () => {
    scheduleMocks.getActorStateMock.mockResolvedValue({
      actorType: 'npc',
      actorId: 'npc-1',
      state: {},
      lastEventSeq: 0n,
    });

    const app = makeApp();
    const res = await app.request(
      '/sessions/11111111-1111-4111-8111-111111111111/npc-schedules',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          npcId: 'npc-1',
          scheduleData: npcSchedule,
        }),
      }
    );

    expect(res.status).toBe(201);
    const body = (await res.json()) as { ok: boolean; schedule: { npcId: string } };
    expect(body.ok).toBe(true);
    expect(body.schedule.npcId).toBe('npc-1');
  });

  it('returns 404 when npc is missing on create', async () => {
    scheduleMocks.getActorStateMock.mockResolvedValue(null);

    const app = makeApp();
    const res = await app.request(
      '/sessions/11111111-1111-4111-8111-111111111111/npc-schedules',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          npcId: 'npc-1',
          scheduleData: npcSchedule,
        }),
      }
    );

    expect(res.status).toBe(404);
  });

  it('updates npc schedule', async () => {
    scheduleMocks.getActorStateMock.mockResolvedValue({
      actorType: 'npc',
      actorId: 'npc-1',
      state: { schedule: { scheduleData: npcSchedule } },
      lastEventSeq: 0n,
    });

    const app = makeApp();
    const res = await app.request(
      '/sessions/11111111-1111-4111-8111-111111111111/npc-schedules/npc-1',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleData: npcSchedule }),
      }
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; schedule: unknown };
    expect(body.ok).toBe(true);
    expect(body.schedule).toBeDefined();
  });

  it('deletes npc schedule', async () => {
    scheduleMocks.getActorStateMock.mockResolvedValue({
      actorType: 'npc',
      actorId: 'npc-1',
      state: { schedule: { scheduleData: npcSchedule } },
      lastEventSeq: 0n,
    });

    const app = makeApp();
    const res = await app.request(
      '/sessions/11111111-1111-4111-8111-111111111111/npc-schedules/npc-1',
      { method: 'DELETE' }
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });
});
