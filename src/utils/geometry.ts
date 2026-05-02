import type { Bounds, GuideLine, ResizeHandle, UIElement } from '../types/editor';
import { clamp } from './elements';

export function getBounds(items: UIElement[]): Bounds | null {
  if (!items.length) return null;
  const x = Math.min(...items.map((el) => el.x));
  const y = Math.min(...items.map((el) => el.y));
  const right = Math.max(...items.map((el) => el.x + el.w));
  const bottom = Math.max(...items.map((el) => el.y + el.h));
  return { x, y, right, bottom, w: right - x, h: bottom - y, cx: (x + right) / 2, cy: (y + bottom) / 2 };
}

export function rectsIntersect(a: Bounds, b: Bounds) {
  return a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y;
}

export function rectContains(a: Bounds, b: Bounds) {
  return b.x >= a.x && b.y >= a.y && b.right <= a.right && b.bottom <= a.bottom;
}

export function makeBounds(x1: number, y1: number, x2: number, y2: number): Bounds {
  const x = Math.min(x1, x2), y = Math.min(y1, y2), right = Math.max(x1, x2), bottom = Math.max(y1, y2);
  return { x, y, right, bottom, w: right - x, h: bottom - y, cx: (x + right) / 2, cy: (y + bottom) / 2 };
}

export function snapMove(items: UIElement[], movingIds: string[], dx: number, dy: number, canvasW: number, canvasH: number, zoom: number) {
  const moving = items.filter((el) => movingIds.includes(el.id));
  const b = getBounds(moving);
  if (!b) return { dx, dy, guides: [] as GuideLine[] };
  const moved = { ...b, x: b.x + dx, y: b.y + dy, right: b.right + dx, bottom: b.bottom + dy, cx: b.cx + dx, cy: b.cy + dy };
  const threshold = 8 * 100 / Math.max(10, zoom);
  const guides: GuideLine[] = [];
  const vRefs = [0, canvasW / 2, canvasW];
  const hRefs = [0, canvasH / 2, canvasH];
  for (const el of items) {
    if (movingIds.includes(el.id) || !el.visible) continue;
    vRefs.push(el.x, el.x + el.w / 2, el.x + el.w);
    hRefs.push(el.y, el.y + el.h / 2, el.y + el.h);
  }
  const movingV = [moved.x, moved.cx, moved.right];
  const movingH = [moved.y, moved.cy, moved.bottom];
  let bestVX: { delta: number; pos: number } | null = null;
  let bestHY: { delta: number; pos: number } | null = null;
  for (const mv of movingV) for (const ref of vRefs) {
    const delta = ref - mv;
    if (Math.abs(delta) <= threshold && (!bestVX || Math.abs(delta) < Math.abs(bestVX.delta))) bestVX = { delta, pos: ref };
  }
  for (const mh of movingH) for (const ref of hRefs) {
    const delta = ref - mh;
    if (Math.abs(delta) <= threshold && (!bestHY || Math.abs(delta) < Math.abs(bestHY.delta))) bestHY = { delta, pos: ref };
  }
  if (bestVX) { dx += bestVX.delta; guides.push({ orientation: 'v', pos: bestVX.pos, start: 0, end: canvasH }); }
  if (bestHY) { dy += bestHY.delta; guides.push({ orientation: 'h', pos: bestHY.pos, start: 0, end: canvasW }); }
  return { dx, dy, guides };
}

export function resizeRect(start: Bounds, handle: ResizeHandle, dx: number, dy: number, keepRatio: boolean, canvasW: number, canvasH: number) {
  let x = start.x, y = start.y, w = start.w, h = start.h;
  if (handle.includes('e')) w = start.w + dx;
  if (handle.includes('s')) h = start.h + dy;
  if (handle.includes('w')) { x = start.x + dx; w = start.w - dx; }
  if (handle.includes('n')) { y = start.y + dy; h = start.h - dy; }
  if (keepRatio) {
    const ratio = start.w / Math.max(1, start.h);
    if (Math.abs(dx) >= Math.abs(dy)) h = w / ratio; else w = h * ratio;
    if (handle.includes('w')) x = start.right - w;
    if (handle.includes('n')) y = start.bottom - h;
  }
  w = Math.max(10, w); h = Math.max(10, h);
  x = clamp(x, 0, Math.max(0, canvasW - w)); y = clamp(y, 0, Math.max(0, canvasH - h));
  w = clamp(w, 10, canvasW - x); h = clamp(h, 10, canvasH - y);
  return { x, y, w, h, right: x + w, bottom: y + h, cx: x + w / 2, cy: y + h / 2 } as Bounds;
}
