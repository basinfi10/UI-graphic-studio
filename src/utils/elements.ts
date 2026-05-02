import { DEFAULT_CANVAS_H, DEFAULT_CANVAS_W, shapes } from '../data/shapes';
import type { IconElement, ImageElement, ShapeElement, SvgColorPath, TextElement, UIElement } from '../types/editor';

export const uid = (prefix = 'el') => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max));
export const deepCopy = (items: UIElement[]) => items.map((item) => ({
  ...item,
  shadow: item.shadow ? { ...item.shadow } : undefined,
  emboss: item.emboss ? { ...item.emboss } : undefined,
  ...(item.kind === 'image' ? { crop: { ...item.crop } } : {}),
  ...(item.kind === 'icon' && item.svgColorPaths ? { svgColorPaths: item.svgColorPaths.map((path) => ({ ...path })) } : {}),
} as UIElement));

const defaultShadow = { enabled: false, x: 0, y: 12, blur: 24, spread: 0, color: '#000000', opacity: 0.28 };
const defaultEmboss = { enabled: false, depth: 3, softness: 8, highlightOpacity: 0.32, shadowOpacity: 0.26 };

export function makeShape(shapeId = 'rect'): ShapeElement {
  const shape = shapes.find((s) => s.id === shapeId) ?? shapes[0];
  const isLine = ['line', 'doubleLine', 'freehand'].includes(shapeId);
  const is3d = shape.group === 'ui3d';
  const circleLike = ['circle', 'uiCircleButton', 'uiSphere', 'uiRing', 'uiKnob', 'uiBadge', 'uiCylinder', 'ui3dEllipse'].includes(shapeId);
  const volume = ['ui3dRect', 'ui3dRoundRect', 'ui3dEllipse', 'uiCardRaised', 'uiCardGlass'].includes(shapeId);
  const browserLike = ['browserWindow','mobileFrame','frame','section'].includes(shapeId);
  const isButton = ['uiPrimaryButton','uiSecondaryButton','uiDangerButton','uiGhostButton','uiNeonButton','uiSoftButton','uiSegmentButton','uiToolbarButton','uiFloatingButton','uiIconButton','uiSplitButton','uiChipButton','uiTabButton','uiGlassButton','uiOutlineButton'].includes(shapeId);
  return {
    id: uid('shape'), kind: 'shape', name: shape.name,
    x: 120, y: 110,
    w: shapeId === 'freehand' ? 220 : isLine ? 280 : shapeId === 'browserWindow' ? 360 : shapeId === 'mobileFrame' ? 210 : shapeId === 'section' ? 320 : isButton ? 190 : volume ? 260 : is3d && !circleLike ? 250 : 160,
    h: shapeId === 'freehand' ? 120 : isLine ? 28 : shapeId === 'browserWindow' ? 220 : shapeId === 'mobileFrame' ? 390 : shapeId === 'section' ? 150 : isButton ? 56 : volume ? 160 : is3d && !circleLike ? 76 : 160,
    fillEnabled: shapeId === 'freehand' ? false : true, fill: shapeId === 'uiDangerButton' ? '#DC2626' : shapeId === 'uiSecondaryButton' ? '#475569' : shapeId === 'uiGhostButton' ? 'transparent' : shapeId === 'uiNeonButton' ? '#0F172A' : shapeId === 'uiSoftButton' ? '#E0F2FE' : '#2563EB', stroke: shapeId === 'uiGhostButton' ? '#93C5FD' : shapeId === 'uiNeonButton' ? '#22D3EE' : '#93C5FD', strokeWidth: shapeId === 'freehand' ? 4 : shapeId === 'uiGhostButton' || shapeId === 'uiToolbarButton' ? 1 : is3d ? 0 : 1, strokeStyle: 'solid', strokeCap: isLine ? 'round' : 'butt', strokeJoin: 'round', booleanOp: 'none',
    radius: circleLike ? 999 : shapeId === 'mobileFrame' ? 28 : shapeId === 'browserWindow' ? 18 : shapeId === 'ui3dRect' ? 8 : shapeId === 'ui3dRoundRect' ? 30 : isButton ? 16 : shapeId === 'roundRect' || shapeId.startsWith('ui') || browserLike ? 24 : 6,
    opacity: 1, rotate: 0, visible: true, locked: false, shapeId,
    text: isButton ? 'Button' : shapeId === 'browserWindow' ? 'Browser' : shapeId === 'section' ? 'Section' : shapeId === 'uiGlossButton' ? 'Button' : shapeId === 'uiBadge' ? 'NEW' : '', textColor: shapeId === 'uiSoftButton' ? '#075985' : '#FFFFFF', fontSize: shapeId === 'uiBadge' ? 18 : isButton ? 17 : 16,
    fontFamily: 'Malgun Gothic, system-ui, sans-serif', fontWeight: 700, fontStyle: 'normal', textAlign: 'center', verticalAlign: 'center', letterSpacing: 0, lineHeight: 1.2, textDecoration: 'none', pathData: shapeId === 'freehand' ? 'M0 60 C40 10 90 110 140 55 S200 70 220 35' : undefined, shadow: { ...defaultShadow }, emboss: { ...defaultEmboss },
  };
}

export function makeText(): TextElement {
  return { id: uid('text'), kind: 'text', name: 'Text', x: 160, y: 150, w: 380, h: 100, fillEnabled: true, fill: 'transparent', stroke: 'transparent', strokeWidth: 0, strokeStyle: 'solid', strokeCap: 'butt', strokeJoin: 'round', booleanOp: 'none', radius: 0, opacity: 1, rotate: 0, visible: true, locked: false, text: '새 텍스트를 입력하세요', textColor: '#FFFFFF', fontSize: 30, fontFamily: 'Malgun Gothic, system-ui, sans-serif', fontWeight: 700, fontStyle: 'normal', textAlign: 'left', verticalAlign: 'start', letterSpacing: 0, lineHeight: 1.25, textDecoration: 'none', shadow: { ...defaultShadow }, emboss: { ...defaultEmboss } };
}

export function makeIcon(symbol = '✦', name = 'Icon'): IconElement {
  const size = 88;
  return { id: uid('icon'), kind: 'icon', name, x: 190, y: 170, w: size, h: size, fillEnabled: true, fill: 'transparent', stroke: 'transparent', strokeWidth: 0, strokeStyle: 'solid', strokeCap: 'round', strokeJoin: 'round', booleanOp: 'none', radius: 0, opacity: 1, rotate: 0, visible: true, locked: false, iconSymbol: symbol, text: symbol, textColor: '#FFFFFF', fontSize: Math.round(size * 0.72), fontFamily: '"Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", system-ui, sans-serif', fontWeight: 700, fontStyle: 'normal', textAlign: 'center', verticalAlign: 'center', letterSpacing: 0, lineHeight: 1, textDecoration: 'none', keepIconScale: true, iconSource: 'text', shadow: { ...defaultShadow }, emboss: { ...defaultEmboss } };
}

export function makeSvgIcon(paths: string[], name = 'SVG Icon', viewBox = '0 0 24 24'): IconElement {
  const icon = makeIcon('', name);
  icon.iconSource = 'svg';
  icon.svgPaths = paths;
  icon.svgViewBox = viewBox;
  icon.name = name;
  icon.w = 92;
  icon.h = 92;
  icon.fontSize = 58;
  icon.textColor = '#E0F2FE';
  icon.stroke = 'transparent';
  icon.fill = 'transparent';
  return icon;
}

export function makeColorSvgIcon(paths: SvgColorPath[], name = 'Color Icon', viewBox = '0 0 24 24'): IconElement {
  const icon = makeIcon('', name);
  icon.iconSource = 'colorSvg';
  icon.svgColorPaths = paths.map((path) => ({ ...path }));
  icon.svgViewBox = viewBox;
  icon.name = name;
  icon.w = 104;
  icon.h = 104;
  icon.fontSize = 58;
  icon.textColor = '#FFFFFF';
  icon.stroke = 'transparent';
  icon.fill = 'transparent';
  icon.radius = 24;
  return icon;
}

export function makeImage(src: string, name = 'Image'): ImageElement {
  return { id: uid('image'), kind: 'image', name, x: 180, y: 140, w: 360, h: 220, fillEnabled: true, fill: 'transparent', stroke: '#93C5FD', strokeWidth: 0, strokeStyle: 'solid', strokeCap: 'butt', strokeJoin: 'round', booleanOp: 'none', radius: 12, opacity: 1, rotate: 0, visible: true, locked: false, src, objectFit: 'cover', objectPositionX: 50, objectPositionY: 50, imageMask: 'rect', brightness: 100, contrast: 100, grayscale: 0, saturation: 100, sharpness: 100, sepia: 0, hueRotate: 0, invert: 0, blur: 0, effectPreset: 'natural', overlayColor: '#000000', overlayOpacity: 0, crop: { x: 0, y: 0, w: 100, h: 100 }, shadow: { ...defaultShadow }, emboss: { ...defaultEmboss } };
}

export function cloneElement(el: UIElement, canvasW = DEFAULT_CANVAS_W, canvasH = DEFAULT_CANVAS_H, offset = 24): UIElement {
  const clone = { ...el, id: uid(el.kind), name: `${el.name} Copy`, x: clamp(el.x + offset, 0, Math.max(0, canvasW - el.w)), y: clamp(el.y + offset, 0, Math.max(0, canvasH - el.h)), locked: false, visible: true, shadow: el.shadow ? { ...el.shadow } : undefined, emboss: el.emboss ? { ...el.emboss } : undefined } as UIElement;
  if (clone.kind === 'image') clone.crop = { ...el.crop };
  return clone;
}

export const defaultElements: UIElement[] = [
  { ...makeShape('ui3dRoundRect'), id: uid('bg'), name: 'Hero Panel', x: 90, y: 90, w: 760, h: 380, fill: '#1D4ED8', stroke: '#60A5FA', radius: 36, shadow: { enabled: true, x: 0, y: 20, blur: 42, spread: 0, color: '#000000', opacity: 0.34 } },
  { ...makeText(), id: uid('title'), name: 'Title', x: 140, y: 150, w: 520, h: 80, text: 'UI Graphic Studio Pro', fontSize: 46 },
  { ...makeText(), id: uid('sub'), name: 'Subtitle', x: 144, y: 245, w: 570, h: 70, text: '전문 UI 워크스페이스를 위한 v0.8 구조화 버전', textColor: '#DBEAFE', fontSize: 20, fontWeight: 500 },
  { ...makeShape('uiGlossButton'), id: uid('btn'), name: 'CTA Button', x: 144, y: 350, w: 180, h: 58, text: 'Start Design', radius: 20, fill: '#7C3AED' },
  { ...makeIcon('✦', 'Spark'), id: uid('spark'), x: 720, y: 150, w: 96, h: 96, textColor: '#FDE68A' },
];

export function sanitizeElement(raw: unknown, canvasW = DEFAULT_CANVAS_W, canvasH = DEFAULT_CANVAS_H): UIElement | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<UIElement> & Record<string, unknown>;
  const kind = r.kind;
  if (kind !== 'shape' && kind !== 'text' && kind !== 'icon' && kind !== 'image') return null;
  const base = kind === 'shape' ? makeShape(typeof r.shapeId === 'string' ? r.shapeId : 'rect') : kind === 'text' ? makeText() : kind === 'icon' ? makeIcon(typeof r.iconSymbol === 'string' ? r.iconSymbol : '✦', typeof r.name === 'string' ? r.name : 'Icon') : makeImage(typeof r.src === 'string' ? r.src : '', typeof r.name === 'string' ? r.name : 'Image');
  const next = { ...base, ...r, id: typeof r.id === 'string' && r.id ? r.id : uid(kind), kind } as UIElement;
  next.name = typeof r.name === 'string' && r.name ? r.name : base.name;
  next.w = clamp(Number(r.w ?? base.w), 10, Math.max(10, canvasW));
  next.h = clamp(Number(r.h ?? base.h), 10, Math.max(10, canvasH));
  next.x = clamp(Number(r.x ?? base.x), 0, Math.max(0, canvasW - next.w));
  next.y = clamp(Number(r.y ?? base.y), 0, Math.max(0, canvasH - next.h));
  next.strokeWidth = clamp(Number(r.strokeWidth ?? base.strokeWidth), 0, 60);
  next.strokeStyle = r.strokeStyle === 'dashed' || r.strokeStyle === 'dotted' ? r.strokeStyle : 'solid';
  next.strokeCap = r.strokeCap === 'butt' || r.strokeCap === 'square' || r.strokeCap === 'round' ? r.strokeCap : (next.kind === 'shape' && ['line','doubleLine'].includes(next.shapeId) ? 'round' : 'butt');
  next.strokeJoin = r.strokeJoin === 'miter' || r.strokeJoin === 'bevel' || r.strokeJoin === 'round' ? r.strokeJoin : 'round';
  next.booleanOp = r.booleanOp === 'union' || r.booleanOp === 'subtract' || r.booleanOp === 'intersect' || r.booleanOp === 'exclude' ? r.booleanOp : 'none';
  if (next.kind === 'shape' && typeof r.pathData === 'string') next.pathData = r.pathData;
  next.radius = clamp(Number(r.radius ?? base.radius), 0, 999);
  next.opacity = clamp(Number(r.opacity ?? base.opacity), 0.02, 1);
  next.rotate = clamp(Number(r.rotate ?? base.rotate), -180, 180);
  next.visible = typeof r.visible === 'boolean' ? r.visible : true;
  next.locked = typeof r.locked === 'boolean' ? r.locked : false;
  next.fillEnabled = typeof r.fillEnabled === 'boolean' ? r.fillEnabled : base.fillEnabled;
  if ('fontSize' in next) next.fontSize = clamp(Number(next.fontSize ?? 16), 6, 260);
  if ('fontWeight' in next) next.fontWeight = clamp(Number(next.fontWeight ?? 400), 100, 900);
  if ('letterSpacing' in next) next.letterSpacing = clamp(Number(next.letterSpacing ?? 0), -10, 30);
  if ('lineHeight' in next) next.lineHeight = clamp(Number(next.lineHeight ?? 1.2), 0.7, 3);
  if (next.kind === 'icon') {
    next.iconSource = next.iconSource === 'svg' || next.iconSource === 'colorSvg' ? next.iconSource : 'text';
    next.svgPaths = Array.isArray(next.svgPaths) ? next.svgPaths.filter((p) => typeof p === 'string') : undefined;
    next.svgColorPaths = Array.isArray(next.svgColorPaths) ? next.svgColorPaths
      .filter((p) => p && typeof p === 'object' && typeof (p as { d?: unknown }).d === 'string')
      .map((p) => ({
        d: String((p as SvgColorPath).d),
        fill: typeof (p as SvgColorPath).fill === 'string' ? (p as SvgColorPath).fill : undefined,
        stroke: typeof (p as SvgColorPath).stroke === 'string' ? (p as SvgColorPath).stroke : undefined,
        strokeWidth: Number((p as SvgColorPath).strokeWidth ?? 0),
        opacity: Number((p as SvgColorPath).opacity ?? 1),
        lineCap: (p as SvgColorPath).lineCap,
        lineJoin: (p as SvgColorPath).lineJoin,
      })) : undefined;
    if (next.iconSource === 'colorSvg' && !next.svgColorPaths?.length) next.iconSource = 'text';
    next.svgViewBox = typeof next.svgViewBox === 'string' ? next.svgViewBox : '0 0 24 24';
  }
  next.shadow = next.shadow ? { ...defaultShadow, ...next.shadow } : { ...defaultShadow };
  next.emboss = next.emboss ? { ...defaultEmboss, ...next.emboss } : { ...defaultEmboss };
  if (next.kind === 'image') {
    next.objectPositionX = clamp(Number(next.objectPositionX ?? 50), 0, 100);
    next.objectPositionY = clamp(Number(next.objectPositionY ?? 50), 0, 100);
    next.brightness = clamp(Number(next.brightness ?? 100), 0, 200);
    next.contrast = clamp(Number(next.contrast ?? 100), 0, 200);
    next.grayscale = clamp(Number(next.grayscale ?? 0), 0, 100);
    next.saturation = clamp(Number(next.saturation ?? 100), 0, 220);
    next.sharpness = clamp(Number(next.sharpness ?? 100), 0, 200);
    next.sepia = clamp(Number(next.sepia ?? 0), 0, 100);
    next.hueRotate = clamp(Number(next.hueRotate ?? 0), -180, 180);
    next.invert = clamp(Number(next.invert ?? 0), 0, 100);
    next.blur = clamp(Number(next.blur ?? 0), 0, 20);
    next.overlayOpacity = clamp(Number(next.overlayOpacity ?? 0), 0, 1);
    next.crop = next.crop ?? { x: 0, y: 0, w: 100, h: 100 };
  }
  return next;
}

export function sanitizeElements(raw: unknown, canvasW = DEFAULT_CANVAS_W, canvasH = DEFAULT_CANVAS_H) {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => sanitizeElement(item, canvasW, canvasH)).filter(Boolean) as UIElement[];
}
