/**
 * Tool argument schemas for API tool handlers.
 */
import { z } from 'zod';

/**
 * Arguments for examine_object tool.
 */
export const ExamineObjectArgsSchema = z.object({
  target: z.string().min(1),
  focus: z.string().min(1).optional(),
});

export type ExamineObjectArgs = z.infer<typeof ExamineObjectArgsSchema>;

/**
 * Arguments for navigate_player tool.
 */
export const NavigatePlayerArgsSchema = z.object({
  direction: z.string().min(1).optional(),
  destination: z.string().min(1).optional(),
  describe_only: z.boolean().optional(),
});

export type NavigatePlayerArgs = z.infer<typeof NavigatePlayerArgsSchema>;

/**
 * Arguments for use_item tool.
 */
export const UseItemArgsSchema = z.object({
  item_name: z.string().min(1),
  target: z.string().min(1).optional(),
  action: z.string().min(1).optional(),
});

export type UseItemArgs = z.infer<typeof UseItemArgsSchema>;
