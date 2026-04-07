import {
  EVT,
  type ChatSendPayload,
  type JoinPayload,
  type MovePayload,
} from "@virtual-cosmos/shared";
import type { Server } from "socket.io";
import { computeClusters } from "../state/proximity.js";
import {
  addPlayer,
  allPlayers,
  getPlayer,
  getSnapshot,
  movePlayer,
  removePlayer,
} from "../state/worldState.js";

// Track previous group assignments so we only emit on state transitions
let prevGroups = new Map<string, string | null>();

function broadcastWorld(io: Server) {
  io.emit(EVT.STATE, { players: getSnapshot() });
}

/**
 * Re-compute clusters and handle group transitions.
 * Only emits proximity:update when a player's groupId actually changes,
 * avoiding unnecessary "still connected" spam.
 */
function syncProximity(io: Server) {
  const players = allPlayers();
  const newGroups = computeClusters(players);

  for (const p of players) {
    const oldG = prevGroups.get(p.id) ?? null;
    const newG = newGroups.get(p.id) ?? null;

    if (oldG === newG) continue;

    const sock = io.sockets.sockets.get(p.socketId);
    if (!sock) continue;

    if (oldG) sock.leave(oldG);
    if (newG) sock.join(newG);

    p.groupId = newG;

    const peers = newG
      ? players
          .filter((o) => o.id !== p.id && newGroups.get(o.id) === newG)
          .map((o) => o.id)
      : [];

    sock.emit(EVT.PROX, {
      groupId: newG,
      connectedPeers: peers,
    });
  }

  prevGroups = newGroups;
}

export function attachSocketHandlers(io: Server) {
  io.on("connection", (socket) => {
    console.log(`[io] + ${socket.id}`);

    socket.on(EVT.JOIN, (raw: unknown) => {
      const d = raw as JoinPayload;
      if (!d?.id || typeof d.id !== "string") {
        socket.disconnect(true);
        return;
      }
      const name = (typeof d.name === "string" && d.name.trim()) ? d.name.trim().slice(0, 24) : "Traveler";
      const color = typeof d.color === "string" && /^#[0-9a-fA-F]{6}$/.test(d.color) ? d.color : "#6c5ce7";

      addPlayer(socket.id, d.id, name, color);
      syncProximity(io);
      broadcastWorld(io);
    });

    socket.on(EVT.MOVE, (raw: unknown) => {
      const d = raw as MovePayload;
      if (typeof d?.x !== "number" || typeof d?.y !== "number") return;
      const moved = movePlayer(socket.id, d.x, d.y);
      if (!moved) return;
      syncProximity(io);
      broadcastWorld(io);
    });

    socket.on(EVT.CHAT_SEND, (raw: unknown) => {
      const d = raw as ChatSendPayload;
      if (!d?.text || typeof d.text !== "string") return;
      const text = d.text.trim().slice(0, 500);
      if (!text) return;
      const me = getPlayer(socket.id);
      if (!me || !me.groupId) return;

      io.to(me.groupId).emit(EVT.CHAT_MSG, {
        from: me.id,
        fromName: me.name,
        text,
        ts: Date.now(),
      });
    });

    socket.on("disconnect", () => {
      console.log(`[io] - ${socket.id}`);
      removePlayer(socket.id);
      syncProximity(io);
      broadcastWorld(io);
    });
  });
}
