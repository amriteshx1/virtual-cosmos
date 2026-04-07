import { useCallback, useEffect, useRef } from "react";

const MOVE_KEYS = new Set([
  "KeyW", "KeyA", "KeyS", "KeyD",
  "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
]);

function isInput(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
}

export function useMovement() {
  const pressed = useRef(new Set<string>());

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (isInput(e.target)) return;
      const c = normalize(e);
      if (c && MOVE_KEYS.has(c)) {
        e.preventDefault();
        pressed.current.add(c);
      }
    };
    const up = (e: KeyboardEvent) => {
      const c = normalize(e);
      if (c) pressed.current.delete(c);
    };
    const blur = () => pressed.current.clear();

    window.addEventListener("keydown", down, true);
    window.addEventListener("keyup", up, true);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down, true);
      window.removeEventListener("keyup", up, true);
      window.removeEventListener("blur", blur);
    };
  }, []);

  return useCallback((): { dx: number; dy: number } => {
    let dx = 0;
    let dy = 0;
    const k = pressed.current;
    if (k.has("KeyW") || k.has("ArrowUp")) dy -= 1;
    if (k.has("KeyS") || k.has("ArrowDown")) dy += 1;
    if (k.has("KeyA") || k.has("ArrowLeft")) dx -= 1;
    if (k.has("KeyD") || k.has("ArrowRight")) dx += 1;
    const len = Math.hypot(dx, dy);
    if (len === 0) return { dx: 0, dy: 0 };
    return { dx: dx / len, dy: dy / len };
  }, []);
}

function normalize(e: KeyboardEvent): string | null {
  if (MOVE_KEYS.has(e.code)) return e.code;
  const k = e.key.toLowerCase();
  if (k === "w") return "KeyW";
  if (k === "a") return "KeyA";
  if (k === "s") return "KeyS";
  if (k === "d") return "KeyD";
  return null;
}
