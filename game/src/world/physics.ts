import { TILE } from "../core/constants";
import type { Level } from "./level";
import { T } from "./level";

export interface Body {
  x: number; y: number; w: number; h: number;
  vx: number; vy: number;
  onGround: boolean;
}

export interface MoveResult { hitWallX: number; hitCeil: boolean; landed: boolean; landVy: number }

/** Axis-separated tile collision with one-way platforms. */
export function moveBody(b: Body, L: Level, dt: number, o: { dropThrough?: boolean; ignoreOneWay?: boolean } = {}): MoveResult {
  const res: MoveResult = { hitWallX: 0, hitCeil: false, landed: false, landVy: 0 };
  const wasGround = b.onGround;

  // --- X ---
  b.x += b.vx * dt;
  const top = Math.floor(b.y / TILE), bot = Math.floor((b.y + b.h - 0.01) / TILE);
  if (b.vx > 0) {
    const col = Math.floor((b.x + b.w - 0.01) / TILE);
    for (let r = top; r <= bot; r++) if (L.solidAt(col, r)) { b.x = col * TILE - b.w; b.vx = 0; res.hitWallX = 1; break; }
  } else if (b.vx < 0) {
    const col = Math.floor(b.x / TILE);
    for (let r = top; r <= bot; r++) if (L.solidAt(col, r)) { b.x = (col + 1) * TILE; b.vx = 0; res.hitWallX = -1; break; }
  }

  // --- Y ---
  const prevBottom = b.y + b.h;
  b.y += b.vy * dt;
  b.onGround = false;
  const l = Math.floor(b.x / TILE), r = Math.floor((b.x + b.w - 0.01) / TILE);
  if (b.vy >= 0) {
    const row = Math.floor((b.y + b.h) / TILE);
    for (let c = l; c <= r; c++) {
      const t = L.get(c, row);
      const surf = row * TILE;
      if (L.isSolid(t) || (L.isOneWay(t) && !o.dropThrough && !o.ignoreOneWay && prevBottom <= surf + 0.5)) {
        if (b.y + b.h >= surf) {
          res.landVy = b.vy;
          b.y = surf - b.h;
          b.vy = 0;
          b.onGround = true;
          if (!wasGround) res.landed = true;
          break;
        }
      }
    }
  } else {
    const row = Math.floor(b.y / TILE);
    for (let c = l; c <= r; c++) if (L.solidAt(c, row)) { b.y = (row + 1) * TILE; b.vy = 0; res.hitCeil = true; break; }
  }
  return res;
}

/** Is there standable ground just below a point? */
export function groundBelow(L: Level, x: number, y: number) {
  const t = L.get(Math.floor(x / TILE), Math.floor((y + 1) / TILE));
  return L.isSolid(t) || L.isOneWay(t);
}

/** Does the rect touch any tile of a given type? */
export function touchesTile(L: Level, x: number, y: number, w: number, h: number, type: number, inset = 2) {
  const l = Math.floor((x + inset) / TILE), r = Math.floor((x + w - inset) / TILE);
  const t = Math.floor((y + inset) / TILE), b = Math.floor((y + h - 1) / TILE);
  for (let cx = l; cx <= r; cx++) for (let cy = t; cy <= b; cy++) if (L.get(cx, cy) === type) return true;
  return false;
}

export { T };
