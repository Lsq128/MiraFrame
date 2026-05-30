import { z } from "zod";

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  story: z.string().optional(),
  style: z.string().optional(),
  status: z.enum(["draft", "generating", "completed", "failed"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Project = z.infer<typeof ProjectSchema>;

export const CharacterSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().url().nullable(),
  status: z.enum(["draft", "approved", "superseded"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Character = z.infer<typeof CharacterSchema>;
