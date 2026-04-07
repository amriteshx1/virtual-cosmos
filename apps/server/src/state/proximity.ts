import { PROXIMITY_RADIUS } from "@virtual-cosmos/shared";
import type { ServerPlayer } from "./worldState.js";

// Pre-compute squared radius to avoid sqrt in the hot loop
const R2 = PROXIMITY_RADIUS * PROXIMITY_RADIUS;

/**
 * Proximity clustering via Union-Find with path compression.
 *
 * All player pairs are checked (O(n²)). When distanceSquared < R², the two
 * players are unioned into the same set. After processing, each connected
 * component becomes a chat group. Lone players get groupId = null.
 */
export function computeClusters(players: ServerPlayer[]): Map<string, string | null> {
  const parent = new Map<string, string>();

  function find(a: string): string {
    let r = a;
    while (parent.get(r) !== r) r = parent.get(r)!;
    let c = a;
    while (c !== r) {
      const next = parent.get(c)!;
      parent.set(c, r);
      c = next;
    }
    return r;
  }

  function union(a: string, b: string) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) {
      if (ra < rb) parent.set(rb, ra);
      else parent.set(ra, rb);
    }
  }

  for (const p of players) parent.set(p.id, p.id);

  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const a = players[i]!;
      const b = players[j]!;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      if (dx * dx + dy * dy < R2) {
        union(a.id, b.id);
      }
    }
  }

  const groups = new Map<string, string[]>();
  for (const p of players) {
    const root = find(p.id);
    let arr = groups.get(root);
    if (!arr) {
      arr = [];
      groups.set(root, arr);
    }
    arr.push(p.id);
  }

  const result = new Map<string, string | null>();
  for (const [root, members] of groups) {
    if (members.length === 1) {
      result.set(members[0]!, null);
    } else {
      const gid = `group:${root}`;
      for (const m of members) result.set(m, gid);
    }
  }

  return result;
}
