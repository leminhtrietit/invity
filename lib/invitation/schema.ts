import { z } from "zod";

const hexColor = z.string().regex(/^#[0-9a-f]{6}$/i);

export const invitationThemeSchema = z.object({
  background: hexColor,
  surface: hexColor,
  ink: hexColor,
  muted: hexColor,
  accent: hexColor,
  accentSoft: hexColor,
  displayFont: z.enum(["editorial", "romantic", "modern"]),
  bodyFont: z.enum(["humanist", "classic"]),
});

export const invitationContentSchema = z.object({
  title: z.string().trim().min(1).max(120),
  prelude: z.string().trim().max(240).optional(),
  hosts: z.array(z.object({ name: z.string().trim().min(1).max(80), role: z.string().trim().max(60) })).min(1).max(4),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }).optional(),
  timezone: z.literal("Asia/Ho_Chi_Minh"),
  venue: z.object({
    name: z.string().trim().min(1).max(120),
    address: z.string().trim().min(1).max(240),
    mapUrl: z.string().url(),
  }),
  cover: z.object({ src: z.string().min(1), alt: z.string().trim().min(1).max(180) }).optional(),
  story: z.object({ eyebrow: z.string().max(60), heading: z.string().max(120), body: z.string().max(1200) }).optional(),
  schedule: z.array(z.object({ time: z.string().regex(/^\d{2}:\d{2}$/), title: z.string().max(100), note: z.string().max(180).optional() })).max(8),
  album: z.array(z.object({ src: z.string().min(1), alt: z.string().min(1).max(180) })).max(12),
  rsvp: z.object({ enabled: z.boolean(), closesAt: z.string().datetime({ offset: true }).optional(), maxCompanions: z.number().int().min(0).max(10) }),
  gift: z.object({ enabled: z.boolean(), message: z.string().max(280) }),
  wishes: z.object({ enabled: z.boolean(), samples: z.array(z.object({ author: z.string().max(80), message: z.string().max(360) })).max(6) }),
  sections: z.object({ story: z.boolean(), countdown: z.boolean(), schedule: z.boolean(), album: z.boolean(), rsvp: z.boolean(), gift: z.boolean(), wishes: z.boolean() }),
});

export type InvitationTheme = z.infer<typeof invitationThemeSchema>;
export type InvitationContent = z.infer<typeof invitationContentSchema>;
export type InvitationMode = "preview" | "public";
