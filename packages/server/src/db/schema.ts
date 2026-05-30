import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  real,
  boolean,
  timestamp,
  jsonb,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Project ──
export const projects = pgTable("project", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  story: text("story"),
  style: varchar("style", { length: 100 }).notNull().default("anime"),
  summary: text("summary"),
  storyOutline: jsonb("story_outline").$type<Record<string, unknown>>(),
  visualBible: text("visual_bible"),
  outlineApproved: boolean("outline_approved").notNull().default(false),
  videoUrl: text("video_url"),
  status: varchar("status", { length: 50 }).notNull().default("draft"),
  textProviderOverride: varchar("text_provider_override"),
  imageProviderOverride: varchar("image_provider_override"),
  videoProviderOverride: varchar("video_provider_override"),
  targetShotCount: integer("target_shot_count"),
  characterHints: jsonb("character_hints").$type<string[]>().default([]),
  creationMode: varchar("creation_mode"),
  universeId: integer("universe_id"),
  chapterNumber: integer("chapter_number"),
  chapterTitle: varchar("chapter_title"),
  referenceImages: jsonb("reference_images").$type<string[]>().default([]),
  exports: jsonb("exports").$type<string[]>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Character ──
export const characters = pgTable(
  "character",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    referenceImages: jsonb("reference_images").$type<string[]>().default([]),
    faceEmbedding: text("face_embedding"),
    visualNotes: text("visual_notes"),
    approvedName: varchar("approved_name"),
    approvedDescription: text("approved_description"),
    approvedImageUrl: text("approved_image_url"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvalVersion: integer("approval_version").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    projectIdx: index("character_project_idx").on(table.projectId),
  }),
);

// ── Shot ──
export const shots = pgTable(
  "shot",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    order: integer("order").notNull(),
    description: text("description").notNull(),
    prompt: text("prompt"),
    imagePrompt: text("image_prompt"),
    imageUrl: text("image_url"),
    videoUrl: text("video_url"),
    duration: real("duration"),
    camera: varchar("camera"),
    motionNote: text("motion_note"),
    scene: text("scene"),
    action: text("action"),
    expression: varchar("expression"),
    lighting: varchar("lighting"),
    dialogue: text("dialogue"),
    sfx: varchar("sfx"),
    ttsUrl: text("tts_url"),
    bgmType: varchar("bgm_type"),
    seed: integer("seed"),
    characterIds: jsonb("character_ids").$type<number[]>().notNull().default([]),
    approvedDescription: text("approved_description"),
    approvedPrompt: text("approved_prompt"),
    approvedImagePrompt: text("approved_image_prompt"),
    approvedDuration: real("approved_duration"),
    approvedCamera: varchar("approved_camera"),
    approvedMotionNote: text("approved_motion_note"),
    approvedScene: text("approved_scene"),
    approvedAction: text("approved_action"),
    approvedExpression: varchar("approved_expression"),
    approvedLighting: varchar("approved_lighting"),
    approvedDialogue: text("approved_dialogue"),
    approvedSfx: varchar("approved_sfx"),
    approvedCharacterIds: jsonb("approved_character_ids").$type<number[]>().notNull().default([]),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvalVersion: integer("approval_version").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    projectIdx: index("shot_project_idx").on(table.projectId),
    orderIdx: index("shot_order_idx").on(table.order),
  }),
);

// ── ShotCharacterBinding ──
export const shotCharacterBindings = pgTable(
  "shot_character_binding",
  {
    shotId: integer("shot_id")
      .notNull()
      .references(() => shots.id, { onDelete: "cascade" }),
    characterId: integer("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.shotId, table.characterId] }),
    shotIdx: index("scb_shot_idx").on(table.shotId),
    charIdx: index("scb_char_idx").on(table.characterId),
  }),
);

// ── AgentRun ──
export const agentRuns = pgTable(
  "agentrun",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 50 }).notNull().default("queued"),
    currentAgent: varchar("current_agent"),
    progress: real("progress").notNull().default(0.0),
    routeDecision: text("route_decision"),
    patchPlan: text("patch_plan"),
    error: text("error"),
    resourceType: varchar("resource_type"),
    resourceId: integer("resource_id"),
    threadId: varchar("thread_id"),
    providerSnapshot: jsonb("provider_snapshot").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    projectIdx: index("agentrun_project_idx").on(table.projectId),
    threadIdx: index("agentrun_thread_idx").on(table.threadId),
    resourceIdx: index("agentrun_resource_idx").on(table.resourceType, table.resourceId),
  }),
);

// ── AgentMessage ──
export const agentMessages = pgTable(
  "agentmessage",
  {
    id: serial("id").primaryKey(),
    runId: integer("run_id")
      .notNull()
      .references(() => agentRuns.id, { onDelete: "cascade" }),
    agent: varchar("agent", { length: 100 }).notNull(),
    role: varchar("role", { length: 50 }).notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    runIdx: index("agentmsg_run_idx").on(table.runId),
  }),
);

// ── Message ──
export const messages = pgTable(
  "message",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    runId: integer("run_id").references(() => agentRuns.id, { onDelete: "set null" }),
    agent: varchar("agent", { length: 100 }).notNull(),
    role: varchar("role", { length: 50 }).notNull(),
    content: text("content").notNull(),
    summary: text("summary"),
    progress: real("progress"),
    isLoading: boolean("is_loading").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    projectIdx: index("msg_project_idx").on(table.projectId),
    runIdx: index("msg_run_idx").on(table.runId),
  }),
);

// ── Relations ──
export const projectRelations = relations(projects, ({ many }) => ({
  characters: many(characters),
  shots: many(shots),
  agentRuns: many(agentRuns),
  messages: many(messages),
}));

export const characterRelations = relations(characters, ({ one, many }) => ({
  project: one(projects, { fields: [characters.projectId], references: [projects.id] }),
  shotBindings: many(shotCharacterBindings),
}));

export const shotRelations = relations(shots, ({ one, many }) => ({
  project: one(projects, { fields: [shots.projectId], references: [projects.id] }),
  characterBindings: many(shotCharacterBindings),
}));

export const shotCharacterBindingRelations = relations(shotCharacterBindings, ({ one }) => ({
  shot: one(shots, { fields: [shotCharacterBindings.shotId], references: [shots.id] }),
  character: one(characters, {
    fields: [shotCharacterBindings.characterId],
    references: [characters.id],
  }),
}));

export const agentRunRelations = relations(agentRuns, ({ one, many }) => ({
  project: one(projects, { fields: [agentRuns.projectId], references: [projects.id] }),
  messages: many(agentMessages),
}));

export const agentMessageRelations = relations(agentMessages, ({ one }) => ({
  run: one(agentRuns, { fields: [agentMessages.runId], references: [agentRuns.id] }),
}));

export const messageRelations = relations(messages, ({ one }) => ({
  project: one(projects, { fields: [messages.projectId], references: [projects.id] }),
  run: one(agentRuns, { fields: [messages.runId], references: [agentRuns.id] }),
}));
