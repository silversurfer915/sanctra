import { z } from "zod";
export const id = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/);
export const date = z.iso.date();
export const timezone = z
  .string()
  .max(100)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, "Use an IANA timezone");
export const page = {
  limit: z.number().int().min(1).max(100).optional(),
  cursor: z.string().min(1).max(4096).optional(),
};
export const range = {
  from: date.optional(),
  to: date.optional(),
  timezone: timezone.optional(),
};
export const status = z.enum(["open", "in_progress", "resolved"]);
export const jee = z
  .strictObject({
    subject: z.enum(["physics", "chemistry", "maths"]),
    chapterId: z.number().int().min(1).max(100000),
    kind: z.enum(["lecture", "practice", "revision", "mockAnalysis"]),
    questions: z.number().int().min(1).max(10000).optional(),
  })
  .refine(
    (x) => x.questions === undefined || x.kind === "practice",
    "Questions require practice kind",
  );
export const task = z.strictObject({
  text: z.string().trim().min(1).max(500),
  dueDate: z.union([date, z.literal("")]),
  subjectId: id.optional(),
  workspaceId: id.optional(),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional(),
  endTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional(),
  jee: jee.optional(),
});
export const scheduled = z.strictObject({
  subjectId: id,
  date,
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  plannedDurationSeconds: z.number().int().min(1).max(86400),
  timezone: timezone.optional(),
  title: z.string().min(1).max(500).refine(value=>value.trim().length>0,'Use a nonblank title').optional(),
  notes: z.string().max(5000).optional(),
  jee: jee.optional(),
});
const nonempty = <T extends z.ZodRawShape>(shape: T) =>
  z
    .strictObject(shape)
    .refine((x) => Object.keys(x).length > 0, "At least one field is required");
export const aiUser = nonempty({
  enabled: z.boolean().optional(),
  extraDaily: z.number().int().min(0).max(1000000).optional(),
  dailyLimit: z.number().int().min(0).max(1000000).nullable().optional(),
  requestsPerMinute: z.number().int().min(1).max(60).nullable().optional(),
});
export const aiGlobal = nonempty({
  enabled: z.boolean().optional(),
  maintenanceMessage: z.string().min(1).max(300).refine(value=>value.trim().length>0,'Use a nonblank message').optional(),
  model: z
    .string()
    .max(100)
    .regex(/^(?:gemini-[A-Za-z0-9._-]+)?$/)
    .optional(),
  chatEnabled: z.boolean().optional(),
  manualEnabled: z.boolean().optional(),
  validationEnabled: z.boolean().optional(),
  requestsPerMinute: z.number().int().min(1).max(60).optional(),
  inputPricePerMillion: z.number().min(0).max(1000).optional(),
  outputPricePerMillion: z.number().min(0).max(1000).optional(),
});
const bool = z.boolean().optional(),
  time = z.number().int().min(0).max(4102444800000).optional();
export const platform = nonempty({
  sitePaused: bool,
  pauseStartsAt: time,
  pauseEndsAt: time,
  noticeEndsAt: time,
  chatEnabled: bool,
  chatAttachmentsEnabled: bool,
  groupCreationEnabled: bool,
  announcementPopupsEnabled: bool,
  maintenanceMode: bool,
  groupsEnabled: bool,
  supportEnabled: bool,
  rankingsEnabled: bool,
  syllabusEnabled: bool,
  jeeTrackEnabled: bool,
  notice: z.string().max(300).optional(),
  noticeType: z.enum(["info", "warning", "maintenance"]).optional(),
  maintenanceMessage: z.string().max(2000).optional(),
  maintenanceEta: z.string().max(150).optional(),
});
export const sessionPatch = nonempty({
  notes: z.string().max(5000).optional(),
  subjectId: id.optional(),
  date: date.optional(),
  startTime: z.number().int().min(0).max(4102444800000).optional(),
  durationSeconds: z.number().int().min(0).max(86400).optional(),
  scheduledStart: z.iso.datetime({ offset: true }).optional(),
  plannedDurationSeconds: z.number().int().min(1).max(86400).optional(),
  completeJeeChapter: z.boolean().optional(),
  jee: jee.optional(),
});
export function mutation(
  target: z.ZodRawShape,
  input: z.ZodType,
  keys: string[],
) {
  const shape: Record<string, z.ZodType> = {};
  for (const key of keys) shape[key] = z.string().max(1024);
  if (!keys.includes("jeeChapter"))
    shape.jeeChapter = z.string().max(1024).optional();
  return z
    .strictObject({
      ...target,
      operationId: id,
      reason: z.string().trim().min(1).max(500),
      expectedVersions: z.strictObject(shape),
      input,
    })
    .refine(
      (x) =>
        !(x.input as any)?.completeJeeChapter ||
        typeof (x.expectedVersions as any).jeeChapter === "string",
      "JEE completion requires jeeChapter version",
    );
}
