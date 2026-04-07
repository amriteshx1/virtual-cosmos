// ── World ──
export const WORLD_W = 3000;
export const WORLD_H = 2000;
export const VIEWPORT_W = 900;
export const VIEWPORT_H = 640;
export const PROXIMITY_RADIUS = 100;
export const AVATAR_RADIUS = 18;
export const GRID_SIZE = 60;
export const MOVE_SPEED = 260;
export const EMIT_INTERVAL_MS = 50;

// ── Socket event names ──
export const EVT = {
  JOIN: "user:join",
  MOVE: "user:move",
  STATE: "world:state",
  PROX: "proximity:update",
  CHAT_MSG: "chat:message",
  CHAT_SEND: "chat:send",
} as const;

// ── Types ──
export type Vec2 = { x: number; y: number };

export type PlayerState = {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
};

export type ProximityInfo = {
  groupId: string | null;
  connectedPeers: string[];
};

export type WorldSnapshot = {
  players: PlayerState[];
};

export type JoinPayload = {
  id: string;
  name: string;
  color: string;
};

export type MovePayload = {
  x: number;
  y: number;
};

export type ChatSendPayload = {
  text: string;
};

export type ChatMsgPayload = {
  from: string;
  fromName: string;
  text: string;
  ts: number;
};

export function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function clampPos(x: number, y: number): Vec2 {
  return {
    x: clamp(x, AVATAR_RADIUS, WORLD_W - AVATAR_RADIUS),
    y: clamp(y, AVATAR_RADIUS, WORLD_H - AVATAR_RADIUS),
  };
}
