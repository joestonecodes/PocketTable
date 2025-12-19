import { z } from 'zod';

export const AssetTypeSchema = z.enum(['CHARACTER', 'PROP', 'MOUNT', 'ATTACHMENT']);

export const TokenSchema = z.object({
  id: z.string(),
  type: AssetTypeSchema,
  x: z.number(),
  y: z.number(),
  rotation: z.number().default(0),
  scale: z.number().default(1),
  layer: z.enum(['MAP', 'FOG', 'TOKEN', 'ATTACHMENT']).default('TOKEN'),
  ownerId: z.string().nullable().default(null),
  src: z.string(), // URL or DataURI
  label: z.string().default(''),
  visible: z.boolean().default(true),
  statusRings: z.array(z.string()).default([]), // Array of hex colors
  locked: z.boolean().default(false),
  attachedToId: z.string().optional(),
});

export const DrawingSchema = z.object({
  id: z.string(),
  type: z.enum(['brush', 'line', 'rect', 'circle', 'polygon', 'erase', 'text']),
  points: z.array(z.number()), // [x, y] for text
  color: z.string(),
  width: z.number(),
  fill: z.string().optional(), // background color for sticky notes
  text: z.string().optional(),
  layer: z.string().default('DRAWING'),
});

export const FogShapeSchema = z.object({
  id: z.string(),
  type: z.enum(['rect', 'polygon']),
  points: z.array(z.number()),
  holes: z.array(z.array(z.number())).default([]), // Subtractive shapes
  visible: z.boolean().default(true),
});

export const PlayerPresenceSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  color: z.string(),
  cursor: z.object({ x: z.number(), y: z.number() }).nullable().default(null),
  connected: z.boolean().default(true),
  isGm: z.boolean().default(false),
});

export const TimerSchema = z.object({
  id: z.string(),
  label: z.string().default('Timer'),
  durationSec: z.number(),
  remainingSec: z.number(),
  status: z.enum(['PAUSED', 'RUNNING', 'FINISHED']),
  updatedAt: z.number(), // timestamp for sync
});

export const MapConfigSchema = z.object({
  url: z.string(),
  width: z.number(),
  height: z.number(),
  offset: z.object({ x: z.number(), y: z.number() }).default({ x: 0, y: 0 }),
  scale: z.number().default(1),
});

export const RoomConfigSchema = z.object({
  gridType: z.enum(['SQUARE']).default('SQUARE'),
  gridSize: z.number().default(50), // pixels
  gridScale: z.number().default(5), // units (ft)
  gridVisible: z.boolean().default(true),
  gridColor: z.string().default('#000000'),
  gridOpacity: z.number().default(0.2),
  snapToGrid: z.boolean().default(false),
  scaleToGrid: z.boolean().default(false),
});

export const RoomStateSchema = z.object({
  id: z.string(),
  gmId: z.string(),
  passwordHash: z.string().nullable(),
  config: RoomConfigSchema,
  map: MapConfigSchema.nullable(),
  tokens: z.record(TokenSchema),
  drawings: z.record(DrawingSchema),
  fog: z.array(FogShapeSchema),
  timer: TimerSchema.nullable(),
  players: z.record(PlayerPresenceSchema),
});

export type TokenType = z.infer<typeof TokenSchema>;
export type DrawingType = z.infer<typeof DrawingSchema>;
export type FogShapeType = z.infer<typeof FogShapeSchema>;
export type PlayerPresenceType = z.infer<typeof PlayerPresenceSchema>;
export type RoomStateType = z.infer<typeof RoomStateSchema>;
