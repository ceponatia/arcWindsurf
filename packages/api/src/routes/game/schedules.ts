/**
 * Schedule Template API Routes
 *
 * Provides CRUD operations for schedule templates and NPC schedules.
 * Templates are reusable patterns for NPC daily routines.
 *
 * @see dev-docs/27-npc-schedules-and-routines.md
 * @see dev-docs/planning/opus-refactor.md Phase 6
 */
import type { Hono } from 'hono';
import { z } from 'zod';
import { ScheduleTemplateSchema, NpcScheduleSchema } from '@minimal-rpg/schemas';
import { db } from '../../db/prismaClient.js';
import type { ApiError } from '../../types.js';
import type { ScheduleTemplateRow, NpcScheduleRow } from '../../db/types.js';
import { getOwnerEmail } from '../../auth/ownerEmail.js';

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
   * Query params:
   *   - isSystem: boolean - Filter by system templates only
   */
  app.get('/schedule-templates', async (c) => {
    const isSystemParam = c.req.query('isSystem');
    const isSystem =
      isSystemParam === 'true' ? true : isSystemParam === 'false' ? false : undefined;

    try {
      const templates =
        isSystem !== undefined
          ? await db.scheduleTemplate.findMany({ where: { isSystem } })
          : await db.scheduleTemplate.findMany();

      return c.json({
        ok: true,
        templates: templates.map((t: ScheduleTemplateRow) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          templateData: t.templateData,
          requiredPlaceholders: t.requiredPlaceholders,
          isSystem: t.isSystem,
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
    const { id } = c.req.param();

    try {
      const template = await db.scheduleTemplate.findUnique({ where: { id } });

      if (!template) {
        return c.json({ ok: false, error: 'Schedule template not found' } satisfies ApiError, 404);
      }

      return c.json({
        ok: true,
        template: {
          id: template.id,
          name: template.name,
          description: template.description,
          templateData: template.templateData,
          requiredPlaceholders: template.requiredPlaceholders,
          isSystem: template.isSystem,
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
      let body: unknown;
      try {
        body = await c.req.json();
      } catch {
        return c.json({ ok: false, error: 'Invalid JSON body' } satisfies ApiError, 400);
      }
      const parsed = CreateScheduleTemplateSchema.safeParse(body);

      if (!parsed.success) {
        return c.json(
          {
            ok: false,
            error: 'Invalid request body',
            details: parsed.error.format(),
          } satisfies ApiError,
          400
        );
      }

      const { name, description, templateData, requiredPlaceholders } = parsed.data;

      // Validate template data against schema
      const templateValidation = ScheduleTemplateSchema.safeParse(templateData);
      if (!templateValidation.success) {
        return c.json(
          {
            ok: false,
            error: 'Invalid template data',
            details: templateValidation.error.format(),
          } satisfies ApiError,
          400
        );
      }

      // Build data object, only including defined values for optional fields
      const createData: {
        name: string;
        description?: string;
        templateData: unknown;
        requiredPlaceholders: string[];
        isSystem: boolean;
      } = {
        name,
        templateData,
        requiredPlaceholders,
        isSystem: false, // User-created templates are never system templates
      };
      if (description !== undefined) {
        createData.description = description;
      }

      const template = await db.scheduleTemplate.create({
        data: createData,
      });

      return c.json(
        {
          ok: true,
          template: {
            id: template.id,
            name: template.name,
            description: template.description,
            templateData: template.templateData,
            requiredPlaceholders: template.requiredPlaceholders,
            isSystem: template.isSystem,
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
   * Cannot update system templates.
   */
  app.put('/schedule-templates/:id', async (c) => {
    const { id } = c.req.param();

    try {
      // Check if template exists and is not a system template
      const existing = await db.scheduleTemplate.findUnique({ where: { id } });
      if (!existing) {
        return c.json({ ok: false, error: 'Schedule template not found' } satisfies ApiError, 404);
      }
      if (existing.isSystem) {
        return c.json(
          { ok: false, error: 'Cannot modify system templates' } satisfies ApiError,
          403
        );
      }

      let body: unknown;
      try {
        body = await c.req.json();
      } catch {
        return c.json({ ok: false, error: 'Invalid JSON body' } satisfies ApiError, 400);
      }
      const parsed = UpdateScheduleTemplateSchema.safeParse(body);

      if (!parsed.success) {
        return c.json(
          {
            ok: false,
            error: 'Invalid request body',
            details: parsed.error.format(),
          } satisfies ApiError,
          400
        );
      }

      const { name, description, templateData, requiredPlaceholders } = parsed.data;

      // Validate template data if provided
      if (templateData !== undefined) {
        const templateValidation = ScheduleTemplateSchema.safeParse(templateData);
        if (!templateValidation.success) {
          return c.json(
            {
              ok: false,
              error: 'Invalid template data',
              details: templateValidation.error.format(),
            } satisfies ApiError,
            400
          );
        }
      }

      // Build update data, only including defined values
      const updateData: {
        name?: string;
        description?: string;
        templateData?: unknown;
        requiredPlaceholders?: string[];
      } = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (templateData !== undefined) updateData.templateData = templateData;
      if (requiredPlaceholders !== undefined)
        updateData.requiredPlaceholders = requiredPlaceholders;

      const template = await db.scheduleTemplate.update({
        where: { id },
        data: updateData,
      });

      return c.json({
        ok: true,
        template: {
          id: template.id,
          name: template.name,
          description: template.description,
          templateData: template.templateData,
          requiredPlaceholders: template.requiredPlaceholders,
          isSystem: template.isSystem,
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
   * Cannot delete system templates.
   */
  app.delete('/schedule-templates/:id', async (c) => {
    const { id } = c.req.param();

    try {
      const existing = await db.scheduleTemplate.findUnique({ where: { id } });
      if (!existing) {
        return c.json({ ok: false, error: 'Schedule template not found' } satisfies ApiError, 404);
      }
      if (existing.isSystem) {
        return c.json(
          { ok: false, error: 'Cannot delete system templates' } satisfies ApiError,
          403
        );
      }

      await db.scheduleTemplate.delete({ where: { id } });
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
  // NPC Schedule Routes
  // =========================================================================

  /**
   * GET /sessions/:sessionId/npc-schedules
   * List all NPC schedules for a session.
   */
  app.get('/sessions/:sessionId/npc-schedules', async (c) => {
    const { sessionId } = c.req.param();

    try {
      const schedules = await db.npcSchedule.findMany({
        where: { sessionId },
      });

      return c.json({
        ok: true,
        schedules: schedules.map((s: NpcScheduleRow) => ({
          id: s.id,
          sessionId: s.sessionId,
          npcId: s.npcId,
          templateId: s.templateId,
          scheduleData: s.scheduleData,
          placeholderMappings: s.placeholderMappings,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        })),
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
    const { sessionId, npcId } = c.req.param();

    try {
      const schedule = await db.npcSchedule.findUnique({
        where: { sessionId_npcId: { sessionId, npcId } },
      });

      if (!schedule) {
        return c.json({ ok: false, error: 'NPC schedule not found' } satisfies ApiError, 404);
      }

      return c.json({
        ok: true,
        schedule: {
          id: schedule.id,
          sessionId: schedule.sessionId,
          npcId: schedule.npcId,
          templateId: schedule.templateId,
          scheduleData: schedule.scheduleData,
          placeholderMappings: schedule.placeholderMappings,
          createdAt: schedule.createdAt,
          updatedAt: schedule.updatedAt,
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
    const { sessionId } = c.req.param();

    try {
      let body: unknown;
      try {
        body = await c.req.json();
      } catch {
        return c.json({ ok: false, error: 'Invalid JSON body' } satisfies ApiError, 400);
      }
      const parsed = CreateNpcScheduleSchema.safeParse(body);

      if (!parsed.success) {
        return c.json(
          {
            ok: false,
            error: 'Invalid request body',
            details: parsed.error.format(),
          } satisfies ApiError,
          400
        );
      }

      const { npcId, templateId, scheduleData, placeholderMappings } = parsed.data;
      const ownerEmail = getOwnerEmail(c);

      // Validate schedule data against schema
      const scheduleValidation = NpcScheduleSchema.safeParse(scheduleData);
      if (!scheduleValidation.success) {
        return c.json(
          {
            ok: false,
            error: 'Invalid schedule data',
            details: scheduleValidation.error.format(),
          } satisfies ApiError,
          400
        );
      }

      // Build create data, only including defined values
      const createData: {
        sessionId: string;
        npcId: string;
        templateId?: string;
        scheduleData: unknown;
        placeholderMappings?: unknown;
        ownerEmail: string;
      } = {
        sessionId,
        npcId,
        scheduleData,
        ownerEmail,
      };
      if (templateId !== undefined) createData.templateId = templateId;
      if (placeholderMappings !== undefined) createData.placeholderMappings = placeholderMappings;

      // Build update data
      const updateData: {
        templateId?: string;
        scheduleData?: unknown;
        placeholderMappings?: unknown;
      } = { scheduleData };
      if (templateId !== undefined) updateData.templateId = templateId;
      if (placeholderMappings !== undefined) updateData.placeholderMappings = placeholderMappings;

      const schedule = await db.npcSchedule.upsert({
        where: { sessionId_npcId: { sessionId, npcId } },
        create: createData,
        update: updateData,
      });

      return c.json(
        {
          ok: true,
          schedule: {
            id: schedule.id,
            sessionId: schedule.sessionId,
            npcId: schedule.npcId,
            templateId: schedule.templateId,
            scheduleData: schedule.scheduleData,
            placeholderMappings: schedule.placeholderMappings,
            createdAt: schedule.createdAt,
            updatedAt: schedule.updatedAt,
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
    const { sessionId, npcId } = c.req.param();

    try {
      const existing = await db.npcSchedule.findUnique({
        where: { sessionId_npcId: { sessionId, npcId } },
      });
      if (!existing) {
        return c.json({ ok: false, error: 'NPC schedule not found' } satisfies ApiError, 404);
      }

      let body: unknown;
      try {
        body = await c.req.json();
      } catch {
        return c.json({ ok: false, error: 'Invalid JSON body' } satisfies ApiError, 400);
      }
      const parsed = UpdateNpcScheduleSchema.safeParse(body);

      if (!parsed.success) {
        return c.json(
          {
            ok: false,
            error: 'Invalid request body',
            details: parsed.error.format(),
          } satisfies ApiError,
          400
        );
      }

      const { templateId, scheduleData, placeholderMappings } = parsed.data;
      const ownerEmail = getOwnerEmail(c);

      // Validate schedule data if provided
      if (scheduleData !== undefined) {
        const scheduleValidation = NpcScheduleSchema.safeParse(scheduleData);
        if (!scheduleValidation.success) {
          return c.json(
            {
              ok: false,
              error: 'Invalid schedule data',
              details: scheduleValidation.error.format(),
            } satisfies ApiError,
            400
          );
        }
      }

      // Build create data for upsert, using existing values as fallbacks
      const createData: {
        sessionId: string;
        npcId: string;
        templateId?: string;
        scheduleData: unknown;
        placeholderMappings?: unknown;
        ownerEmail: string;
      } = {
        sessionId,
        npcId,
        scheduleData: scheduleData ?? existing.scheduleData,
        ownerEmail,
      };
      const existingTemplateId = existing.templateId;
      if (templateId !== undefined) {
        createData.templateId = templateId;
      } else if (existingTemplateId !== null) {
        createData.templateId = existingTemplateId;
      }
      if (placeholderMappings !== undefined) {
        createData.placeholderMappings = placeholderMappings;
      } else if (existing.placeholderMappings !== null) {
        createData.placeholderMappings = existing.placeholderMappings;
      }

      // Build update data, only including defined values
      const updateData: {
        templateId?: string;
        scheduleData?: unknown;
        placeholderMappings?: unknown;
      } = {};
      if (templateId !== undefined) updateData.templateId = templateId;
      if (scheduleData !== undefined) updateData.scheduleData = scheduleData;
      if (placeholderMappings !== undefined) updateData.placeholderMappings = placeholderMappings;

      const schedule = await db.npcSchedule.upsert({
        where: { sessionId_npcId: { sessionId, npcId } },
        create: createData,
        update: updateData,
      });

      return c.json({
        ok: true,
        schedule: {
          id: schedule.id,
          sessionId: schedule.sessionId,
          npcId: schedule.npcId,
          templateId: schedule.templateId,
          scheduleData: schedule.scheduleData,
          placeholderMappings: schedule.placeholderMappings,
          createdAt: schedule.createdAt,
          updatedAt: schedule.updatedAt,
        },
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
    const { sessionId, npcId } = c.req.param();

    try {
      const existing = await db.npcSchedule.findUnique({
        where: { sessionId_npcId: { sessionId, npcId } },
      });
      if (!existing) {
        return c.json({ ok: false, error: 'NPC schedule not found' } satisfies ApiError, 404);
      }

      await db.npcSchedule.delete({
        where: { sessionId_npcId: { sessionId, npcId } },
      });
      return c.json({ ok: true });
    } catch (error) {
      console.error('Error deleting NPC schedule:', error);
      return c.json({ ok: false, error: 'Failed to delete NPC schedule' } satisfies ApiError, 500);
    }
  });
}
