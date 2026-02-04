export interface ScheduleTemplateRow {
  id: string;
  name: string;
  description: string | null;
  scheduleJson: unknown;
  createdAt: Date;
  updatedAt: Date;
}
