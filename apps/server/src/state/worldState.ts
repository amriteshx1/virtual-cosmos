import { clampPos, type PlayerState } from "@virtual-cosmos/shared";

export type ServerPlayer = {
  socketId: string;
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  groupId: string | null;
};

const players = new Map<string, ServerPlayer>();
const socketToId = new Map<string, string>();

export function addPlayer(socketId: string, id: string, name: string, color: string): ServerPlayer {
  const old = players.get(id);
  if (old && old.socketId !== socketId) {
    socketToId.delete(old.socketId);
  }
  const spawnX = 200 + Math.random() * 600;
  const spawnY = 200 + Math.random() * 400;
  const p: ServerPlayer = {
    socketId,
    id,
    name,
    color,
    x: old?.x ?? spawnX,
    y: old?.y ?? spawnY,
    groupId: null,
  };
  players.set(id, p);
  socketToId.set(socketId, id);
  return p;
}

export function movePlayer(socketId: string, x: number, y: number): ServerPlayer | null {
  const id = socketToId.get(socketId);
  if (!id) return null;
  const p = players.get(id);
  if (!p) return null;
  const c = clampPos(x, y);
  p.x = c.x;
  p.y = c.y;
  return p;
}

export function removePlayer(socketId: string): ServerPlayer | null {
  const id = socketToId.get(socketId);
  if (!id) return null;
  const p = players.get(id);
  if (!p || p.socketId !== socketId) return null;
  socketToId.delete(socketId);
  players.delete(id);
  return p;
}

export function getPlayer(socketId: string): ServerPlayer | null {
  const id = socketToId.get(socketId);
  if (!id) return null;
  return players.get(id) ?? null;
}

export function allPlayers(): ServerPlayer[] {
  return [...players.values()];
}

export function getSnapshot(): PlayerState[] {
  return allPlayers().map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    x: p.x,
    y: p.y,
  }));
}
