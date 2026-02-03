import type { Hono } from 'hono';
import { z } from 'zod';
import { ScheduleTemplateSchema, NpcScheduleSchema, type NpcSchedule } from '@minimal-rpg/schemas';
import {
  drizzle as db,
  scheduleTemplates,
  actorStates,
  eq,
  and,
  getActorState,
  upsertActorState,
} from '@minimal-rpg/db/node';
import type { ApiError } from '../../types.js';
import { toSessionId, toId } from '../../utils/uuid.js';
import { asNpcState, type NpcActorState } from '../../types/index.js';
import { validateBody, validateParam, validateParamId } from '../../utils/request-validation.js';

// =============================================================================
// Request/Response Schemas
// =============================================================================

const CreateScheduleTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  templateData: z.unknown(),
  requiredPlaceholders: z.array(z.string().min(1)),
});

const UpdateScheduleTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  templateData: z.unknown().optional(),
  requiredPlaceholders: z.array(z.string().min(1)).optional(),
});

const CreateNpcScheduleSchema = z.object({
  npcId: z.string().min(1),
  templateId: z.string().uuid().optional(),
  scheduleData: z.unknown(),
  placeholderMappings: z.record(z.string(), z.string()).optional(),
});

const UpdateNpcScheduleSchema = z.object({
  templateId: z.string().uuid().optional(),
  scheduleData: z.unknown().optional(),
  placeholderMappings: z.record(z.string(), z.string()).optional(),
});

// =============================================================================
// Route Handlers
// =============================================================================

/**
 * Register schedule template routes on the given Hono app.
 */
export function registerScheduleRoutes(app: Hono): void {
  // =========================================================================
  // Schedule Template Routes
  // =========================================================================

  /**
   * GET /schedule-templates
   * List all schedule templates.
   */
  app.get('/schedule-templates', async (c) => {
    try {
      const templates = await db.select().from(scheduleTemplates);

      return c.json({
        ok: true,
        templates: templates.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          templateData: t.scheduleJson,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        })),
      });
    } catch (error) {
      console.error('Error listing schedule templates:', error);
      return c.json(
        { ok: false, error: 'Failed to list schedule templates' } satisfies ApiError,
        500
      );
    }
  });

  /**
   * GET /schedule-templates/:id
   * Get a single schedule template by ID.
   */
  app.get('/schedule-templates/:id', async (c) => {
    const idResult = validateParamId(c, 'id');
    if (!idResult.success) return idResult.errorResponse;
    const id = idResult.data;

    try {
      const [template] = await db
        .select()
        .from(scheduleTemplates)
        .where(eq(scheduleTemplates.id, toId(id)))
        .limit(1);

      if (!template) {
        return c.json({ ok: false, error: 'Schedule template not found' } satisfies ApiError, 404);
      }

      return c.json({
        ok: true,
        template: {
          id: template.id,
          name: template.name,
          description: template.description,
          templateData: template.scheduleJson,
          createdAt: template.createdAt,
          updatedAt: template.updatedAt,
        },
      });
    } catch (error) {
      console.error('Error fetching schedule template:', error);
      return c.json(
        { ok: false, error: 'Failed to fetch schedule template' } satisfies ApiError,
        500
      );
    }
  });

  /**
   * POST /schedule-templates
   * Create a new schedule template.
   */
  app.post('/schedule-templates', async (c) => {
    try {
      const parsed = await validateBody(c, CreateScheduleTemplateSchema);
      if (!parsed.success) return parsed.errorResponse;

      const { name, description, templateData } = parsed.data;

      // Validate template data against schema
      const templateValidation = ScheduleTemplateSchema.safeParse(templateData);
      if (!templateValidation.success) {
        return c.json({ ok: false, error: templateValidation.error.flatten() } satisfies ApiError, 400);
      }

      const [template] = await db
        .insert(scheduleTemplates)
        .values({
          name,
          description: description ?? null,
          scheduleJson: templateData,
        })
        .returning();

      if (!template) {
        return c.json({ ok: false, error: 'Failed to create template' } satisfies ApiError, 500);
      }

      return c.json(
        {
          ok: true,
          template: {
            id: template.id,
            name: template.name,
            description: template.description,
            templateData: template.scheduleJson,
            createdAt: template.createdAt,
            updatedAt: template.updatedAt,
          },
        },
        201
      );
    } catch (error) {
      console.error('Error creating schedule template:', error);
      return c.json(
        { ok: false, error: 'Failed to create schedule template' } satisfies ApiError,
        500
      );
    }
  });

  /**
   * PUT /schedule-templates/:id
   * Update an existing schedule template.
   */
  app.put('/schedule-templates/:id', async (c) => {
    const idResult = validateParamId(c, 'id');
    if (!idResult.success) return idResult.errorResponse;
    const id = idResult.data;

    try {
      const parsed = await validateBody(c, UpdateScheduleTemplateSchema);
      if (!parsed.success) return parsed.errorResponse;

      const { name, description, templateData } = parsed.data;

      // Validate template data if provided
      if (templateData !== undefined) {
        const templateValidation = ScheduleTemplateSchema.safeParse(templateData);
        if (!templateValidation.success) {
          return c.json(
            { ok: false, error: templateValidation.error.flatten() } satisfies ApiError,
            400
          );
        }
      }

      const [template] = await db
        .update(scheduleTemplates)
        .set({
          name: name ?? undefined,
          description: description ?? undefined,
          scheduleJson: templateData ?? undefined,
          updatedAt: new Date(),
        })
        .where(eq(scheduleTemplates.id, toId(id)))
        .returning();

      if (!template) {
        return c.json({ ok: false, error: 'not found' }, 404);
      }

      return c.json({
        ok: true,
        template: {
          id: template.id,
          name: template.name,
          description: template.description,
          templateData: template.scheduleJson,
          createdAt: template.createdAt,
          updatedAt: template.updatedAt,
        },
      });
    } catch (error) {
      console.error('Error updating schedule template:', error);
      return c.json(
        { ok: false, error: 'Failed to update schedule template' } satisfies ApiError,
        500
      );
    }
  });

  /**
   * DELETE /schedule-templates/:id
   * Delete a schedule template.
   */
  app.delete('/schedule-templates/:id', async (c) => {
    const idResult = validateParamId(c, 'id');
    if (!idResult.success) return idResult.errorResponse;
    const id = idResult.data;

    try {
      await db.delete(scheduleTemplates).where(eq(scheduleTemplates.id, toId(id)));
      return c.json({ ok: true });
    } catch (error) {
      console.error('Error deleting schedule template:', error);
      return c.json(
        { ok: false, error: 'Failed to delete schedule template' } satisfies ApiError,
        500
      );
    }
  });

  // =========================================================================
  // NPC Schedule Routes (In Actor State)
  // =========================================================================

  /**
   * GET /sessions/:sessionId/npc-schedules
   * List all NPC schedules for a session.
   */
  app.get('/sessions/:sessionId/npc-schedules', async (c) => {
    const sessionIdResult = validateParamId(c, 'sessionId');
    if (!sessionIdResult.success) return sessionIdResult.errorResponse;
    const sessionId = sessionIdResult.data;

    try {
      const npcStates = await db
        .select()
        .from(actorStates)
        .where(
          and(eq(actorStates.sessionId, toSessionId(sessionId)), eq(actorStates.actorType, 'npc'))
        );

      const schedules = npcStates
        .filter((s) => {
          const state = asNpcState(s.state);
          return state.schedule !== undefined;
        })
        .map((s) => {
          const state = asNpcState(s.state);
          return {
            npcId: s.actorId,
            scheduleData: state.schedule?.scheduleData,
            templateId: state.schedule?.templateId,
            placeholderMappings: state.schedule?.placeholderMappings,
          };
        });

      return c.json({
        ok: true,
        schedules,
      });
    } catch (error) {
      console.error('Error listing NPC schedules:', error);
      return c.json({ ok: false, error: 'Failed to list NPC schedules' } satisfies ApiError, 500);
    }
  });

  /**
   * GET /sessions/:sessionId/npc-schedules/:npcId
   * Get the schedule for a specific NPC in a session.
   */
  app.get('/sessions/:sessionId/npc-schedules/:npcId', async (c) => {
    const sessionIdResult = validateParamId(c, 'sessionId');
    if (!sessionIdResult.success) return sessionIdResult.errorResponse;
    const sessionId = sessionIdResult.data;

    const npcIdResult = validateParam(c, 'npcId', z.string().trim().min(1));
    if (!npcIdResult.success) return npcIdResult.errorResponse;
    const npcId = npcIdResult.data;

    try {
      const actorState = await getActorState(toSessionId(sessionId), npcId);

      const state = actorState ? asNpcState(actorState.state) : null;
      if (!state?.schedule) {
        return c.json({ ok: false, error: 'NPC schedule not found' } satisfies ApiError, 404);
      }

      const schedule = state.schedule;

      return c.json({
        ok: true,
        schedule: {
          npcId,
          ...schedule,
        },
      });
    } catch (error) {
      console.error('Error fetching NPC schedule:', error);
      return c.json({ ok: false, error: 'Failed to fetch NPC schedule' } satisfies ApiError, 500);
    }
  });

  /**
   * POST /sessions/:sessionId/npc-schedules
   * Create or update an NPC schedule for a session.
   */
  app.post('/sessions/:sessionId/npc-schedules', async (c) => {
    const sessionIdResult = validateParamId(c, 'sessionId');
    if (!sessionIdResult.success) return sessionIdResult.errorResponse;
    const sessionId = sessionIdResult.data;

    try {
      const parsed = await validateBody(c, CreateNpcScheduleSchema);
      if (!parsed.success) return parsed.errorResponse;

      const { npcId, templateId, scheduleData, placeholderMappings } = parsed.data;

      // Validate schedule data against schema
      const scheduleValidation = NpcScheduleSchema.safeParse(scheduleData);
      if (!scheduleValidation.success) {
        return c.json({ ok: false, error: scheduleValidation.error.flatten() } satisfies ApiError, 400);
      }

      const actorState = await getActorState(toSessionId(sessionId), npcId);
      if (!actorState) {
        return c.json({ ok: false, error: 'NPC not found in session' }, 404);
      }

      const npcState = asNpcState(actorState.state);
      const validatedSchedule = scheduleValidation.data;
      const schedulePayload: NpcActorState['schedule'] = {
        scheduleData: validatedSchedule,
        ...(templateId ? { templateId } : {}),
        ...(placeholderMappings ? { placeholderMappings } : {}),
      };

      const newState: NpcActorState = {
        ...npcState,
        ...(schedulePayload ? { schedule: schedulePayload } : {}),
      };

      await upsertActorState({
        sessionId: toSessionId(sessionId),
        actorType: actorState.actorType,
        actorId: npcId,
        entityProfileId: actorState.entityProfileId ?? null,
        state: newState as unknown as Record<string, unknown>,
        lastEventSeq: actorState.lastEventSeq,
      });

      return c.json(
        {
          ok: true,
          schedule: {
            npcId,
            ...(templateId ? { templateId } : {}),
            scheduleData: validatedSchedule,
            ...(placeholderMappings ? { placeholderMappings } : {}),
          },
        },
        201
      );
    } catch (error) {
      console.error('Error creating NPC schedule:', error);
      return c.json({ ok: false, error: 'Failed to create NPC schedule' } satisfies ApiError, 500);
    }
  });

  /**
   * PUT /sessions/:sessionId/npc-schedules/:npcId
   * Update an NPC schedule.
   */
  app.put('/sessions/:sessionId/npc-schedules/:npcId', async (c) => {
    const sessionIdResult = validateParamId(c, 'sessionId');
    if (!sessionIdResult.success) return sessionIdResult.errorResponse;
    const sessionId = sessionIdResult.data;

    const npcIdResult = validateParam(c, 'npcId', z.string().trim().min(1));
    if (!npcIdResult.success) return npcIdResult.errorResponse;
    const npcId = npcIdResult.data;

    try {
      const actorState = await getActorState(toSessionId(sessionId), npcId);
      if (!actorState) {
        return c.json({ ok: false, error: 'not found' }, 404);
      }

      const parsed = await validateBody(c, UpdateNpcScheduleSchema);
      if (!parsed.success) return parsed.errorResponse;

      const { templateId, scheduleData, placeholderMappings } = parsed.data;

      // Validate schedule data if provided
      let validatedSchedule: NpcSchedule | undefined;
      if (scheduleData !== undefined) {
        const scheduleValidation = NpcScheduleSchema.safeParse(scheduleData);
        if (!scheduleValidation.success) {
          return c.json(
            { ok: false, error: scheduleValidation.error.flatten() } satisfies ApiError,
            400
          );
        }
        validatedSchedule = scheduleValidation.data;
      }

      const existingSchedule = asNpcState(actorState.state).schedule ?? {};

      const npcState = asNpcState(actorState.state);
      const schedulePayload: NpcActorState['schedule'] = {
        ...existingSchedule,
        ...(templateId ? { templateId } : {}),
        ...(validatedSchedule ? { scheduleData: validatedSchedule } : {}),
        ...(placeholderMappings !== undefined ? { placeholderMappings } : {}),
      };

      const newState: NpcActorState = {
        ...npcState,
        ...(schedulePayload ? { schedule: schedulePayload } : {}),
      };

      await upsertActorState({
        sessionId: toSessionId(sessionId),
        actorType: actorState.actorType,
        actorId: npcId,
        entityProfileId: actorState.entityProfileId ?? null,
        state: newState as unknown as Record<string, unknown>,
        lastEventSeq: actorState.lastEventSeq,
      });

      return c.json({
        ok: true,
        schedule: newState.schedule,
      });
    } catch (error) {
      console.error('Error updating NPC schedule:', error);
      return c.json({ ok: false, error: 'Failed to update NPC schedule' } satisfies ApiError, 500);
    }
  });

  /**
   * DELETE /sessions/:sessionId/npc-schedules/:npcId
   * Delete an NPC schedule.
   */
  app.delete('/sessions/:sessionId/npc-schedules/:npcId', async (c) => {
    const sessionIdResult = validateParamId(c, 'sessionId');
    if (!sessionIdResult.success) return sessionIdResult.errorResponse;
    const sessionId = sessionIdResult.data;

    const npcIdResult = validateParam(c, 'npcId', z.string().trim().min(1));
    if (!npcIdResult.success) return npcIdResult.errorResponse;
    const npcId = npcIdResult.data;

    try {
      const actorState = await getActorState(toSessionId(sessionId), npcId);
      if (!actorState) {
        return c.json({ ok: false, error: 'NPC schedule not found' } satisfies ApiError, 404);
      }

      const npcState = asNpcState(actorState.state);
      const { schedule: _schedule, ...remainingState } = npcState;
      void _schedule;

      await upsertActorState({
        sessionId: toSessionId(sessionId),
        actorType: actorState.actorType,
        actorId: npcId,
        entityProfileId: actorState.entityProfileId ?? null,
        state: remainingState as unknown as Record<string, unknown>,
        lastEventSeq: actorState.lastEventSeq,
      });

      return c.json({ ok: true });
    } catch (error) {
      console.error('Error deleting NPC schedule:', error);
      return c.json({ ok: false, error: 'Failed to delete NPC schedule' } satisfies ApiError, 500);
    }
  });
}
