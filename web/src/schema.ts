// Zod mirror of shared/models.py. Every server response is parsed with these.
import { z } from "zod";

export const TaskId = z.enum(["calfresh", "cal", "msg"]);
export const Agent = z.enum(["pip", "fern", "bun", "nimbus"]);
export const TaskStatus = z.enum(["queued", "running", "ready", "done", "stopped", "skipped", "need_human"]);

export const Step = z.object({
  seq: z.number().int().nonnegative(),
  task_id: TaskId.nullable().optional(),
  agent: Agent,
  text: z.string().min(1).max(300),
  at: z.number(),
  stop: z.boolean().default(false),
  action: z.string().nullable().optional(),
  target: z.string().nullable().optional(),
  result: z.enum(["ok", "failed", "blocked", "stopped"]).nullable().optional(),
  screenshot: z.string().nullable().optional(),
});

export const TaskState = z.object({
  id: TaskId,
  status: TaskStatus,
  trace_url: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

export const Run = z.object({
  id: z.string(),
  mode: z.enum(["live", "replay"]),
  status: z.enum(["queued", "running", "waiting", "done", "stopped", "failed"]),
  created_at: z.number(),
  tasks: z.array(TaskState),
  steps: z.array(Step),
  device: z.string().nullable().optional(),
});

export const Status = z.object({
  runner_online: z.boolean(),
  phone_online: z.boolean(),
  device: z.string().nullable().optional(),
  last_seen: z.number().nullable().optional(),
  active_run: z.string().nullable().optional(),
  has_recording: z.boolean(),
  owner: z.boolean().optional(),
});

export type StepT = z.infer<typeof Step>;
export type RunT = z.infer<typeof Run>;
export type StatusT = z.infer<typeof Status>;
export type TaskStatusT = z.infer<typeof TaskStatus>;
