import {
  EVT,
  type ChatMsgPayload,
  type PlayerState,
  type ProximityInfo,
  type WorldSnapshot,
} from "@virtual-cosmos/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

function serverUrl(): string {
  const v = import.meta.env.VITE_SOCKET_URL;
  return typeof v === "string" && v ? v.replace(/\/$/, "") : "http://localhost:3001";
}

export function useSocket() {
  const ref = useRef<Socket | null>(null);
  const [live, setLive] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [prox, setProx] = useState<ProximityInfo>({ groupId: null, connectedPeers: [] });
  const [msgs, setMsgs] = useState<ChatMsgPayload[]>([]);

  useEffect(() => () => { ref.current?.disconnect(); }, []);

  const join = useCallback((id: string, name: string, color: string) => {
    ref.current?.disconnect();
    setErr(null);
    setMsgs([]);
    setProx({ groupId: null, connectedPeers: [] });

    const s = io(serverUrl(), {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 600,
    });
    ref.current = s;

    s.on("connect", () => {
      setLive(true);
      setErr(null);
      s.emit(EVT.JOIN, { id, name, color });
    });
    s.on("disconnect", () => setLive(false));
    s.on("connect_error", (e: Error) => {
      setLive(false);
      setErr(e.message || "Cannot reach server — run npm run dev:server");
    });
    s.on(EVT.STATE, (d: WorldSnapshot) => {
      if (d?.players) setPlayers(d.players);
    });
    s.on(EVT.PROX, (d: ProximityInfo) => {
      setProx(d);
      if (!d.groupId) setMsgs([]);
    });
    s.on(EVT.CHAT_MSG, (d: ChatMsgPayload) => {
      if (d?.text) setMsgs((prev) => [...prev, d]);
    });
  }, []);

  const emitMove = useCallback((x: number, y: number) => {
    ref.current?.emit(EVT.MOVE, { x, y });
  }, []);

  const emitChat = useCallback((text: string) => {
    ref.current?.emit(EVT.CHAT_SEND, { text });
  }, []);

  return { live, err, players, prox, msgs, join, emitMove, emitChat };
}
