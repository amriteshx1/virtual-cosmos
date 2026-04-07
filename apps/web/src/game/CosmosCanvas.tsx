import {
  AVATAR_RADIUS,
  clampPos,
  EMIT_INTERVAL_MS,
  GRID_SIZE,
  MOVE_SPEED,
  PROXIMITY_RADIUS,
  VIEWPORT_H,
  VIEWPORT_W,
  WORLD_H,
  WORLD_W,
  type PlayerState,
} from "@virtual-cosmos/shared";
import { Application, Container, Graphics, Text } from "pixi.js";
import { useEffect, useRef } from "react";
import { useMovement } from "./useMovement";

const BG = 0x080c18;
const GRID_COLOR = 0x1a2238;
const GRID_ALPHA = 0.45;
const BORDER_COLOR = 0x2d3a5c;
const R = AVATAR_RADIUS;
const PR = PROXIMITY_RADIUS;
const LERP_SPEED = 18;

function hexNum(hex: string): number {
  return hex.startsWith("#") && hex.length === 7 ? parseInt(hex.slice(1), 16) : 0x6c5ce7;
}

function drawHalo(g: Graphics, color: number, isLocal: boolean) {
  g.clear();
  g.circle(0, 0, PR).fill({ color, alpha: isLocal ? 0.1 : 0.06 });
  g.circle(0, 0, PR).stroke({ width: isLocal ? 1.8 : 1.2, color, alpha: isLocal ? 0.35 : 0.22 });
}

function drawBody(g: Graphics, color: number, linked: boolean) {
  g.clear();
  g.circle(0, 0, R).fill(color);
  g.circle(0, 0, R).stroke({ width: 2, color: 0xffffff, alpha: 0.2 });
  if (linked) {
    g.circle(0, 0, R + 4).stroke({ width: 2.5, color: 0xfbbf24, alpha: 0.85 });
  }
}

type RemoteEntry = {
  root: Container;
  body: Graphics;
  halo: Graphics;
  label: Text;
  tx: number;
  ty: number;
};

export type CanvasProps = {
  myId: string;
  myName: string;
  myColor: string;
  players: PlayerState[];
  connectedPeers: Set<string>;
  onMove: (x: number, y: number) => void;
};

export function CosmosCanvas({ myId, myName, myColor, players, connectedPeers, onMove }: CanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const getDir = useMovement();

  const pixiRef = useRef<{
    app: Application;
    camera: Container;
    localRoot: Container;
    localBody: Graphics;
    localHalo: Graphics;
    localLabel: Text;
    pos: { x: number; y: number };
  } | null>(null);

  const remotesRef = useRef(new Map<string, RemoteEntry>());
  const remotesLayerRef = useRef<Container | null>(null);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  // ── Init Pixi once ──
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let dead = false;
    let lastEmit = 0;

    void (async () => {
      const app = new Application();
      await app.init({ width: VIEWPORT_W, height: VIEWPORT_H, backgroundColor: BG, antialias: true });
      if (dead) { app.destroy(true); return; }
      host.appendChild(app.canvas as HTMLCanvasElement);

      const camera = new Container();
      app.stage.addChild(camera);

      // Subtle dot grid for depth
      const grid = new Graphics();
      for (let gx = 0; gx <= WORLD_W; gx += GRID_SIZE) {
        grid.moveTo(gx, 0).lineTo(gx, WORLD_H);
      }
      for (let gy = 0; gy <= WORLD_H; gy += GRID_SIZE) {
        grid.moveTo(0, gy).lineTo(WORLD_W, gy);
      }
      grid.stroke({ width: 1, color: GRID_COLOR, alpha: GRID_ALPHA });
      camera.addChild(grid);

      const border = new Graphics();
      border.rect(0, 0, WORLD_W, WORLD_H).stroke({ width: 2, color: BORDER_COLOR, alpha: 0.6 });
      camera.addChild(border);

      const remotesLayer = new Container();
      camera.addChild(remotesLayer);
      remotesLayerRef.current = remotesLayer;

      const spawnX = WORLD_W / 2 + (Math.random() - 0.5) * 200;
      const spawnY = WORLD_H / 2 + (Math.random() - 0.5) * 200;
      const pos = clampPos(spawnX, spawnY);

      const localRoot = new Container();
      localRoot.position.set(pos.x, pos.y);

      const localHalo = new Graphics();
      drawHalo(localHalo, hexNum(myColor), true);

      const localBody = new Graphics();
      drawBody(localBody, hexNum(myColor), false);

      const localLabel = new Text({
        text: myName,
        style: { fill: "#e2e8f0", fontSize: 12, fontWeight: "600", fontFamily: "system-ui, sans-serif" },
      });
      localLabel.anchor.set(0.5, 1);
      localLabel.position.set(0, -R - 8);

      localRoot.addChild(localHalo);
      localRoot.addChild(localBody);
      localRoot.addChild(localLabel);
      camera.addChild(localRoot);

      pixiRef.current = { app, camera, localRoot, localBody, localHalo, localLabel, pos };

      // Game loop
      app.ticker.add(() => {
        const p = pixiRef.current;
        if (!p) return;
        const dt = Math.min(0.05, (app.ticker.deltaMS || 16) / 1000);

        // Local movement (client-side prediction)
        const dir = getDir();
        p.pos.x += dir.dx * MOVE_SPEED * dt;
        p.pos.y += dir.dy * MOVE_SPEED * dt;
        const c = clampPos(p.pos.x, p.pos.y);
        p.pos.x = c.x;
        p.pos.y = c.y;
        p.localRoot.position.set(p.pos.x, p.pos.y);

        // Camera follow: keep local player at screen center
        p.camera.position.set(VIEWPORT_W / 2 - p.pos.x, VIEWPORT_H / 2 - p.pos.y);

        // Smooth interpolation for remote avatars
        const a = 1 - Math.exp(-LERP_SPEED * dt);
        for (const [, e] of remotesRef.current) {
          const cx = e.root.position.x;
          const cy = e.root.position.y;
          e.root.position.set(cx + (e.tx - cx) * a, cy + (e.ty - cy) * a);
        }

        // Throttled network emit
        const now = performance.now();
        if (now - lastEmit >= EMIT_INTERVAL_MS) {
          lastEmit = now;
          onMoveRef.current(p.pos.x, p.pos.y);
        }
      });
    })();

    return () => {
      dead = true;
      remotesRef.current.forEach((e) => e.root.destroy({ children: true }));
      remotesRef.current.clear();
      remotesLayerRef.current = null;
      pixiRef.current?.app.destroy(true, { children: true });
      pixiRef.current = null;
    };
  }, [getDir, myColor, myName]);

  // ── Sync remote players from React state into Pixi ──
  useEffect(() => {
    const layer = remotesLayerRef.current;
    if (!layer) return;

    const seen = new Set<string>();

    for (const pl of players) {
      if (pl.id === myId) continue;
      seen.add(pl.id);

      let e = remotesRef.current.get(pl.id);
      if (!e) {
        const root = new Container();
        root.position.set(pl.x, pl.y);
        const halo = new Graphics();
        const body = new Graphics();
        const label = new Text({
          text: pl.name,
          style: { fill: "#cbd5e1", fontSize: 11, fontWeight: "500", fontFamily: "system-ui, sans-serif" },
        });
        label.anchor.set(0.5, 1);
        label.position.set(0, -R - 7);
        root.addChild(halo);
        root.addChild(body);
        root.addChild(label);
        layer.addChild(root);
        e = { root, body, halo, label, tx: pl.x, ty: pl.y };
        remotesRef.current.set(pl.id, e);
      }

      e.tx = pl.x;
      e.ty = pl.y;
      e.label.text = pl.name;

      const col = hexNum(pl.color);
      const linked = connectedPeers.has(pl.id);

      drawHalo(e.halo, col, false);
      drawBody(e.body, col, linked);
    }

    for (const [id, e] of remotesRef.current) {
      if (!seen.has(id)) {
        e.root.destroy({ children: true });
        remotesRef.current.delete(id);
      }
    }
  }, [players, myId, connectedPeers]);

  return (
    <div
      ref={hostRef}
      tabIndex={-1}
      onMouseDown={(e) => e.currentTarget.focus({ preventScroll: true })}
      className="inline-block overflow-hidden rounded-xl border border-white/[0.06] shadow-2xl shadow-black/60 outline-none ring-1 ring-white/[0.04] focus-visible:ring-2 focus-visible:ring-sky-500/60"
    />
  );
}
