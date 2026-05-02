import type { MouseEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ActiveTool, Bounds, EditorAction, EditorSnapshot, EditorState, GuideLine, ResizeHandle, UIElement } from '../../types/editor';
import { clamp, deepCopy, makeShape } from '../../utils/elements';
import { getBounds, makeBounds, rectContains, rectsIntersect, resizeRect, snapMove } from '../../utils/geometry';
import { ElementView, ResizeHandles } from './ElementView';

type CanvasPoint = { x: number; y: number };
type ViewSize = { w: number; h: number };

type Drag =
  | { mode: 'none' }
  | { mode: 'pan'; sx: number; sy: number; startPan: { x: number; y: number } }
  | { mode: 'move'; ids: string[]; sx: number; sy: number; starts: Record<string, { x: number; y: number }>; baseElements: UIElement[]; before: EditorSnapshot }
  | { mode: 'resize'; id: string; handle: ResizeHandle; sx: number; sy: number; start: UIElement; baseElements: UIElement[]; before: EditorSnapshot }
  | { mode: 'resizeGroup'; handle: ResizeHandle; sx: number; sy: number; bounds: Bounds; starts: Record<string, UIElement>; ids: string[]; baseElements: UIElement[]; before: EditorSnapshot }
  | { mode: 'marquee'; sx: number; sy: number; x: number; y: number; additive: boolean }
  | { mode: 'draw'; tool: Exclude<ActiveTool, 'select'>; sx: number; sy: number; x: number; y: number; shift: boolean; alt: boolean; points?: CanvasPoint[]; before: EditorSnapshot }; 

function snapshotOf(state: EditorState): EditorSnapshot {
  return {
    elements: deepCopy(state.elements),
    selectedIds: [...state.selectedIds],
    canvasW: state.canvasW,
    canvasH: state.canvasH,
    tokens: { ...state.tokens },
    customComponents: state.customComponents.map((c) => ({ ...c, elements: deepCopy(c.elements) })),
  };
}

function visibleUnlocked(elements: UIElement[]) {
  return elements.filter((el) => el.visible && !el.locked);
}

function toolToShapeId(tool: Exclude<ActiveTool, 'select'>) {
  if (tool === 'rect') return 'rect';
  if (tool === 'ellipse') return 'ellipse';
  if (tool === 'line') return 'line';
  if (tool === 'pen') return 'freehand';
  return 'arrowRight';
}

function angleSnap(angle: number) {
  const step = Math.PI / 4;
  return Math.round(angle / step) * step;
}


function buildFreehandElement(points: CanvasPoint[], canvasW: number, canvasH: number): UIElement {
  const clean = points.length ? points : [{ x: 0, y: 0 }];
  const minX = Math.min(...clean.map((p) => p.x));
  const minY = Math.min(...clean.map((p) => p.y));
  const maxX = Math.max(...clean.map((p) => p.x));
  const maxY = Math.max(...clean.map((p) => p.y));
  const pad = 8;
  const x = clamp(minX - pad, 0, canvasW);
  const y = clamp(minY - pad, 0, canvasH);
  const w = clamp(maxX - minX + pad * 2, 10, Math.max(10, canvasW - x));
  const h = clamp(maxY - minY + pad * 2, 10, Math.max(10, canvasH - y));
  const rel = clean.map((pt, index) => `${index === 0 ? 'M' : 'L'}${Math.round(pt.x - x)} ${Math.round(pt.y - y)}`).join(' ');
  const el = makeShape('freehand');
  el.name = 'Freehand Path';
  el.x = x;
  el.y = y;
  el.w = w;
  el.h = h;
  el.fillEnabled = false;
  el.stroke = '#E0F2FE';
  el.strokeWidth = 4;
  el.strokeCap = 'round';
  el.strokeJoin = 'round';
  el.pathData = rel;
  return el;
}

function buildDrawElement(tool: Exclude<ActiveTool, 'select'>, sx: number, sy: number, ex: number, ey: number, shift: boolean, alt: boolean, canvasW: number, canvasH: number): UIElement {
  if (tool === 'pen') return buildFreehandElement([{ x: sx, y: sy }, { x: ex, y: ey }], canvasW, canvasH);
  if (tool === 'line' || tool === 'arrow') {
    let dx = ex - sx;
    let dy = ey - sy;
    if (shift) {
      const len = Math.hypot(dx, dy);
      const angle = angleSnap(Math.atan2(dy, dx));
      dx = Math.cos(angle) * len;
      dy = Math.sin(angle) * len;
      ex = sx + dx;
      ey = sy + dy;
    }
    const length = Math.max(10, Math.hypot(dx, dy));
    const h = tool === 'line' ? 24 : 42;
    const el = makeShape(tool === 'line' ? 'line' : 'arrowRight');
    el.name = tool === 'line' ? 'Drawn Line' : 'Drawn Arrow';
    el.w = length;
    el.h = h;
    el.x = clamp((sx + ex) / 2 - length / 2, 0, Math.max(0, canvasW - length));
    el.y = clamp((sy + ey) / 2 - h / 2, 0, Math.max(0, canvasH - h));
    el.rotate = Math.round(Math.atan2(dy, dx) * 180 / Math.PI);
    el.fillEnabled = tool === 'arrow';
    el.strokeWidth = tool === 'line' ? 4 : Math.max(1, el.strokeWidth);
    el.strokeCap = 'round';
    el.strokeJoin = 'round';
    return el;
  }

  let x1 = sx;
  let y1 = sy;
  let x2 = ex;
  let y2 = ey;
  if (shift) {
    const size = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
    x2 = x1 + Math.sign(x2 - x1 || 1) * size;
    y2 = y1 + Math.sign(y2 - y1 || 1) * size;
  }
  let x = Math.min(x1, x2);
  let y = Math.min(y1, y2);
  let w = Math.abs(x2 - x1);
  let h = Math.abs(y2 - y1);
  if (alt) {
    w = Math.abs(x2 - x1) * 2;
    h = Math.abs(y2 - y1) * 2;
    x = x1 - w / 2;
    y = y1 - h / 2;
  }
  if (w < 4 || h < 4) {
    w = tool === 'rect' ? 160 : 140;
    h = tool === 'rect' ? 100 : 140;
    x = sx;
    y = sy;
  }
  const el = makeShape(toolToShapeId(tool));
  el.name = tool === 'rect' ? 'Drawn Rectangle' : 'Drawn Ellipse';
  el.x = clamp(x, 0, Math.max(0, canvasW - 10));
  el.y = clamp(y, 0, Math.max(0, canvasH - 10));
  el.w = clamp(w, 10, Math.max(10, canvasW - el.x));
  el.h = clamp(h, 10, Math.max(10, canvasH - el.y));
  if (tool === 'ellipse' && shift) { el.shapeId = 'circle'; el.name = 'Drawn Circle'; }
  if (tool === 'rect' && shift) { el.name = 'Drawn Square'; }
  return el;
}

export function CanvasView({ state, dispatch, onOpenLayerMenu }: { state: EditorState; dispatch: React.Dispatch<EditorAction>; onOpenLayerMenu: (event: MouseEvent, id: string) => void }) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [viewSize, setViewSize] = useState<ViewSize>({ w: 1, h: 1 });
  const [spaceDown, setSpaceDown] = useState(false);
  const [drag, setDrag] = useState<Drag>({ mode: 'none' });
  const [draftElements, setDraftElements] = useState<UIElement[] | null>(null);
  const [draftGuides, setDraftGuides] = useState<GuideLine[]>([]);

  const renderElements = draftElements ?? state.elements;
  const selected = useMemo(() => renderElements.filter((el) => state.selectedIds.includes(el.id)), [renderElements, state.selectedIds]);
  const selectionBounds = useMemo(() => getBounds(selected), [selected]);
  const scale = state.zoom / 100;
  const scaledW = state.canvasW * scale;
  const scaledH = state.canvasH * scale;
  const scrollPaddingX = 420;
  const scrollPaddingY = 300;
  const scrollW = Math.max(viewSize.w + 2, scaledW + scrollPaddingX * 2);
  const scrollH = Math.max(viewSize.h + 2, scaledH + scrollPaddingY * 2);
  const baseX = (scrollW - scaledW) / 2 + state.pan.x;
  const baseY = (scrollH - scaledH) / 2 + state.pan.y;

  const centerViewportScroll = (nextZoom = state.zoom) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const nextScale = nextZoom / 100;
    const nextScrollW = Math.max(viewport.clientWidth + 2, state.canvasW * nextScale + scrollPaddingX * 2);
    const nextScrollH = Math.max(viewport.clientHeight + 2, state.canvasH * nextScale + scrollPaddingY * 2);
    requestAnimationFrame(() => {
      viewport.scrollLeft = Math.max(0, (nextScrollW - viewport.clientWidth) / 2);
      viewport.scrollTop = Math.max(0, (nextScrollH - viewport.clientHeight) / 2);
    });
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const update = () => setViewSize({ w: viewport.clientWidth, h: viewport.clientHeight });
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(viewport);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || Boolean(target?.isContentEditable);
      if (!typing && event.code === 'Space') {
        setSpaceDown(true);
        event.preventDefault();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') setSpaceDown(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const canvasPoint = (e: { clientX: number; clientY: number }): CanvasPoint => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (e.clientX - rect.left + (viewportRef.current?.scrollLeft ?? 0) - baseX) / scale,
      y: (e.clientY - rect.top + (viewportRef.current?.scrollTop ?? 0) - baseY) / scale,
    };
  };

  const fitCanvas = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const availableW = Math.max(160, viewport.clientWidth - 96);
    const availableH = Math.max(160, viewport.clientHeight - 96);
    const nextZoom = clamp(Math.floor(Math.min(availableW / state.canvasW, availableH / state.canvasH) * 100), 10, 400);
    dispatch({ type: 'SET_ZOOM', zoom: nextZoom });
    dispatch({ type: 'SET_PAN', pan: { x: 0, y: 0 } });
    centerViewportScroll(nextZoom);
    dispatch({ type: 'SET_STATUS', status: '화면 맞춤' });
  };

  useEffect(() => {
    const onFit = () => fitCanvas();
    window.addEventListener('uigs-fit-canvas', onFit);
    return () => window.removeEventListener('uigs-fit-canvas', onFit);
  }, [state.canvasW, state.canvasH, viewSize.w, viewSize.h]);

  const zoomAt = (clientX: number, clientY: number, nextZoom: number) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const p = canvasPoint({ clientX, clientY });
    const nextScale = clamp(nextZoom, 10, 400) / 100;
    const nextScrollW = Math.max(viewSize.w + 2, state.canvasW * nextScale + scrollPaddingX * 2);
    const nextScrollH = Math.max(viewSize.h + 2, state.canvasH * nextScale + scrollPaddingY * 2);
    const scrollLeft = viewportRef.current?.scrollLeft ?? 0;
    const scrollTop = viewportRef.current?.scrollTop ?? 0;
    const nextBaseX = clientX - rect.left + scrollLeft - p.x * nextScale;
    const nextBaseY = clientY - rect.top + scrollTop - p.y * nextScale;
    const centeredX = (nextScrollW - state.canvasW * nextScale) / 2;
    const centeredY = (nextScrollH - state.canvasH * nextScale) / 2;
    dispatch({ type: 'SET_ZOOM', zoom: clamp(nextZoom, 10, 400) });
    dispatch({ type: 'SET_PAN', pan: { x: nextBaseX - centeredX, y: nextBaseY - centeredY } });
  };

  const setZoomCentered = (nextZoom: number) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) {
      dispatch({ type: 'SET_ZOOM', zoom: nextZoom });
      return;
    }
    zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, nextZoom);
  };

  const clearDraft = () => {
    setDraftElements(null);
    setDraftGuides([]);
  };

  const beginMove = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    if (e.button === 1 || spaceDown) {
      e.preventDefault();
      setDrag({ mode: 'pan', sx: e.clientX, sy: e.clientY, startPan: { ...state.pan } });
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }
    if (state.activeTool !== 'select' && e.button === 0) {
      const p = canvasPoint(e);
      const tool = state.activeTool as Exclude<ActiveTool, 'select'>;
      const initialPoints = tool === 'pen' ? [p] : undefined;
      const preview = tool === 'pen' ? buildFreehandElement(initialPoints ?? [p], state.canvasW, state.canvasH) : buildDrawElement(tool, p.x, p.y, p.x, p.y, e.shiftKey, e.altKey, state.canvasW, state.canvasH);
      setDraftElements([...state.elements, preview]);
      dispatch({ type: 'SELECT', ids: [] });
      setDrag({ mode: 'draw', tool, sx: p.x, sy: p.y, x: p.x, y: p.y, shift: e.shiftKey, alt: e.altKey, points: initialPoints, before: snapshotOf(state) });
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }
    const target = state.elements.find((el) => el.id === id);
    if (!target || target.locked) return;

    let ids = state.selectedIds.includes(id) ? state.selectedIds : [id];
    if (target.groupId && !e.shiftKey) ids = state.elements.filter((el) => el.groupId === target.groupId && !el.locked).map((el) => el.id);
    if (e.shiftKey) ids = state.selectedIds.includes(id) ? state.selectedIds.filter((v) => v !== id) : [...state.selectedIds, id];
    ids = ids.filter((itemId) => state.elements.some((el) => el.id === itemId && el.visible && !el.locked));
    if (!ids.length) return;

    dispatch({ type: 'SELECT', ids });
    const p = canvasPoint(e);
    const starts: Record<string, { x: number; y: number }> = {};
    state.elements.filter((el) => ids.includes(el.id)).forEach((el) => {
      starts[el.id] = { x: el.x, y: el.y };
    });
    setDrag({ mode: 'move', ids, sx: p.x, sy: p.y, starts, baseElements: deepCopy(state.elements), before: snapshotOf(state) });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const beginResize = (e: React.PointerEvent, id: string, handle: ResizeHandle) => {
    e.stopPropagation();
    const el = state.elements.find((v) => v.id === id);
    if (!el || el.locked) return;
    const p = canvasPoint(e);
    dispatch({ type: 'SELECT', ids: [id] });
    setDrag({ mode: 'resize', id, handle, sx: p.x, sy: p.y, start: { ...el }, baseElements: deepCopy(state.elements), before: snapshotOf(state) });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const beginGroupResize = (e: React.PointerEvent, handle: ResizeHandle) => {
    if (!selectionBounds || state.selectedIds.length < 2) return;
    e.stopPropagation();
    const p = canvasPoint(e);
    const starts: Record<string, UIElement> = {};
    selected.forEach((el) => {
      if (!el.locked) starts[el.id] = { ...el };
    });
    const ids = Object.keys(starts);
    if (!ids.length) return;
    setDrag({ mode: 'resizeGroup', handle, sx: p.x, sy: p.y, bounds: selectionBounds, starts, ids, baseElements: deepCopy(state.elements), before: snapshotOf(state) });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const beginViewportPointer = (e: React.PointerEvent) => {
    if (e.button === 1 || spaceDown) {
      e.preventDefault();
      setDrag({ mode: 'pan', sx: e.clientX, sy: e.clientY, startPan: { ...state.pan } });
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    const p = canvasPoint(e);
    if (state.activeTool !== 'select' && e.button === 0) {
      const tool = state.activeTool as Exclude<ActiveTool, 'select'>;
      const initialPoints = tool === 'pen' ? [p] : undefined;
      const preview = tool === 'pen' ? buildFreehandElement(initialPoints ?? [p], state.canvasW, state.canvasH) : buildDrawElement(tool, p.x, p.y, p.x, p.y, e.shiftKey, e.altKey, state.canvasW, state.canvasH);
      setDraftElements([...state.elements, preview]);
      dispatch({ type: 'SELECT', ids: [] });
      setDrag({ mode: 'draw', tool, sx: p.x, sy: p.y, x: p.x, y: p.y, shift: e.shiftKey, alt: e.altKey, points: initialPoints, before: snapshotOf(state) });
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }
    if (!e.shiftKey) dispatch({ type: 'SELECT', ids: [] });
    setDrag({ mode: 'marquee', sx: p.x, sy: p.y, x: p.x, y: p.y, additive: e.shiftKey });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const movePointer = (e: React.PointerEvent) => {
    if (drag.mode === 'none') return;

    if (drag.mode === 'pan') {
      dispatch({ type: 'SET_PAN', pan: { x: drag.startPan.x + (e.clientX - drag.sx), y: drag.startPan.y + (e.clientY - drag.sy) } });
      return;
    }

    const p = canvasPoint(e);

    if (drag.mode === 'marquee') {
      const box = makeBounds(drag.sx, drag.sy, p.x, p.y);
      const leftToRight = p.x >= drag.sx;
      const ids = visibleUnlocked(state.elements).filter((el) => {
        const b = { x: el.x, y: el.y, right: el.x + el.w, bottom: el.y + el.h, w: el.w, h: el.h, cx: el.x + el.w / 2, cy: el.y + el.h / 2 };
        return leftToRight ? rectContains(box, b) : rectsIntersect(box, b);
      }).map((el) => el.id);
      dispatch({ type: 'SELECT', ids, additive: drag.additive });
      setDrag({ ...drag, x: p.x, y: p.y });
      return;
    }

    if (drag.mode === 'draw') {
      const points = drag.tool === 'pen' ? [...(drag.points ?? [{ x: drag.sx, y: drag.sy }]), p] : drag.points;
      const preview = drag.tool === 'pen' ? buildFreehandElement(points ?? [p], state.canvasW, state.canvasH) : buildDrawElement(drag.tool, drag.sx, drag.sy, p.x, p.y, e.shiftKey, e.altKey, state.canvasW, state.canvasH);
      setDraftElements([...state.elements, preview]);
      setDrag({ ...drag, x: p.x, y: p.y, shift: e.shiftKey, alt: e.altKey, points });
      return;
    }

    if (drag.mode === 'move') {
      let dx = p.x - drag.sx;
      let dy = p.y - drag.sy;
      let guides: GuideLine[] = [];
      if (state.snapEnabled) {
        dx = Math.round(dx / state.gridSize) * state.gridSize;
        dy = Math.round(dy / state.gridSize) * state.gridSize;
        const snapped = snapMove(drag.baseElements.map((el) => (drag.starts[el.id] ? { ...el, ...drag.starts[el.id] } : el)), drag.ids, dx, dy, state.canvasW, state.canvasH, state.zoom);
        dx = snapped.dx;
        dy = snapped.dy;
        guides = snapped.guides;
      }
      const next = drag.baseElements.map((el) => {
        const s = drag.starts[el.id];
        if (!s) return el;
        return { ...el, x: clamp(s.x + dx, 0, Math.max(0, state.canvasW - el.w)), y: clamp(s.y + dy, 0, Math.max(0, state.canvasH - el.h)) } as UIElement;
      });
      setDraftElements(next);
      setDraftGuides(guides);
      return;
    }

    if (drag.mode === 'resize') {
      const dx = p.x - drag.sx;
      const dy = p.y - drag.sy;
      const b = resizeRect({ x: drag.start.x, y: drag.start.y, right: drag.start.x + drag.start.w, bottom: drag.start.y + drag.start.h, w: drag.start.w, h: drag.start.h, cx: drag.start.x + drag.start.w / 2, cy: drag.start.y + drag.start.h / 2 }, drag.handle, dx, dy, e.shiftKey, state.canvasW, state.canvasH);
      const next = drag.baseElements.map((el) => el.id === drag.id
        ? ({ ...el, x: b.x, y: b.y, w: b.w, h: b.h, fontSize: el.kind === 'icon' && el.keepIconScale ? Math.round(Math.min(b.w, b.h) * 0.72) : 'fontSize' in el ? el.fontSize : undefined } as UIElement)
        : el);
      setDraftElements(next);
      setDraftGuides([]);
      return;
    }

    if (drag.mode === 'resizeGroup') {
      const b = resizeRect(drag.bounds, drag.handle, p.x - drag.sx, p.y - drag.sy, e.shiftKey, state.canvasW, state.canvasH);
      const sx = b.w / Math.max(1, drag.bounds.w);
      const sy = b.h / Math.max(1, drag.bounds.h);
      const next = drag.baseElements.map((el) => {
        const s = drag.starts[el.id];
        if (!s) return el;
        return {
          ...el,
          x: clamp(b.x + (s.x - drag.bounds.x) * sx, 0, Math.max(0, state.canvasW - 10)),
          y: clamp(b.y + (s.y - drag.bounds.y) * sy, 0, Math.max(0, state.canvasH - 10)),
          w: clamp(Math.max(10, s.w * sx), 10, state.canvasW),
          h: clamp(Math.max(10, s.h * sy), 10, state.canvasH),
        } as UIElement;
      });
      const guides = state.snapEnabled ? snapMove(next, drag.ids, 0, 0, state.canvasW, state.canvasH, state.zoom).guides : [];
      setDraftElements(next);
      setDraftGuides(guides);
    }
  };

  const endPointer = () => {
    if (drag.mode === 'draw') {
      const finalElement = drag.tool === 'pen' ? buildFreehandElement(drag.points ?? [{ x: drag.sx, y: drag.sy }, { x: drag.x, y: drag.y }], state.canvasW, state.canvasH) : buildDrawElement(drag.tool, drag.sx, drag.sy, drag.x, drag.y, drag.shift, drag.alt, state.canvasW, state.canvasH);
      dispatch({ type: 'ADD_ELEMENTS', elements: [finalElement], select: true });
      clearDraft();
      setDrag({ mode: 'none' });
      return;
    }
    if (drag.mode === 'move' || drag.mode === 'resize' || drag.mode === 'resizeGroup') {
      if (draftElements) {
        const ids = drag.mode === 'resize' ? [drag.id] : drag.ids;
        dispatch({ type: 'REPLACE_ELEMENTS', elements: draftElements, selectedIds: ids, status: drag.mode === 'move' ? '이동 완료' : '크기 조절 완료' });
      }
    }
    clearDraft();
    setDrag({ mode: 'none' });
  };

  const wheelZoom = (e: React.WheelEvent) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 12 : -12;
    zoomAt(e.clientX, e.clientY, state.zoom + delta);
  };

  const gridStyle: React.CSSProperties = state.gridVisible ? {
    opacity: state.gridOpacity,
    backgroundImage: `linear-gradient(to right, rgba(148,163,184,.55) 1px, transparent 1px),linear-gradient(to bottom, rgba(148,163,184,.55) 1px, transparent 1px),linear-gradient(to right, rgba(203,213,225,.8) 1px, transparent 1px),linear-gradient(to bottom, rgba(203,213,225,.8) 1px, transparent 1px)`,
    backgroundSize: `${state.gridSize}px ${state.gridSize}px,${state.gridSize}px ${state.gridSize}px,${state.gridSize * 5}px ${state.gridSize * 5}px,${state.gridSize * 5}px ${state.gridSize * 5}px`,
  } : {};

  const currentGuides = draftGuides.length ? draftGuides : state.guides;

  return <main className={`canvas-shell ${spaceDown ? 'space-pan' : ''} ${state.activeTool !== 'select' ? 'draw-tool-active' : ''}`}>
    <div className="canvas-top">
      <div className="canvas-meta">
        <b>{state.canvasW}×{state.canvasH}</b>
        <span>Canvas</span>
        <span>{state.status}</span>
        {state.activeTool !== 'select' && <span className="active-tool-badge">{state.activeTool.toUpperCase()} · 드래그 생성 · Shift 비율 · Alt 중심</span>}
      </div>
    </div>
    <div
      className="viewport"
      ref={viewportRef}
      onPointerMove={movePointer}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onPointerLeave={endPointer}
      onPointerDown={beginViewportPointer}
      onWheel={wheelZoom}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="canvas-scroll-space" style={{ width: scrollW, height: scrollH }}>
      <div className="artboard-frame" style={{ left: baseX, top: baseY, width: state.canvasW, height: state.canvasH, transform: `scale(${scale})` }}>
        <div className="grid-layer" style={gridStyle} />
        {renderElements.map((el) => <ElementView key={el.id} el={el} selected={state.selectedIds.includes(el.id)} zoom={state.zoom} showImageControls={el.kind === 'image' && state.selectedIds.includes(el.id)} onPointerDown={beginMove} onDoubleClick={(id) => dispatch({ type: 'SET_EDITING_TEXT', id })} onResizeStart={beginResize} onContextMenu={onOpenLayerMenu} />)}
        {selectionBounds && state.selectedIds.length > 1 && <div className="selection-box" style={{ left: selectionBounds.x, top: selectionBounds.y, width: selectionBounds.w, height: selectionBounds.h }}><ResizeHandles zoom={state.zoom} onDown={beginGroupResize} /></div>}
        {drag.mode === 'marquee' && <div className="marquee" style={{ left: Math.min(drag.sx, drag.x), top: Math.min(drag.sy, drag.y), width: Math.abs(drag.x - drag.sx), height: Math.abs(drag.y - drag.sy) }} />}
        {currentGuides.map((g, i) => <div key={i} className={`guide ${g.orientation}`} style={g.orientation === 'v' ? { left: g.pos, top: g.start, height: g.end - g.start } : { top: g.pos, left: g.start, width: g.end - g.start }} />)}
      </div>
      </div>
    </div>
    <div className="canvas-floating-controls" aria-label="Canvas controls">
      <button type="button" title="새 작업" onClick={() => dispatch({ type: 'NEW_PROJECT' })}>＋</button>
      <button type="button" title="화면 맞춤(F)" onClick={fitCanvas}>▣</button>
      <button type="button" title="줌 아웃" onClick={() => setZoomCentered(state.zoom - 12)}>−</button>
      <button type="button" title="1:1 / 100%" onClick={() => { dispatch({ type: 'SET_ZOOM', zoom: 100 }); dispatch({ type: 'SET_PAN', pan: { x: 0, y: 0 } }); centerViewportScroll(100); }}>1:1</button>
      <button type="button" title="줌 인" onClick={() => setZoomCentered(state.zoom + 12)}>＋</button>
      <button type="button" title="팬 초기화" onClick={() => dispatch({ type: 'SET_PAN', pan: { x: 0, y: 0 } })}>Pan 0</button>
      <span>{Math.round(state.zoom)}%</span>
    </div>
  </main>;
}
