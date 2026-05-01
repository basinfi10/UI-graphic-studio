import type { MouseEvent } from 'react';
import type { ResizeHandle, UIElement } from '../../types/editor';

function shadowCss(el: UIElement) {
  if (!el.shadow?.enabled) return undefined;
  const a = Math.max(0, Math.min(1, el.shadow.opacity));
  return `${el.shadow.x}px ${el.shadow.y}px ${el.shadow.blur}px ${el.shadow.spread}px ${el.shadow.color}${Math.round(a * 255).toString(16).padStart(2, '0')}`;
}

function embossCss(el: UIElement) {
  if (!el.emboss?.enabled) return undefined;
  const d = Math.max(1, el.emboss.depth);
  const b = Math.max(1, el.emboss.softness);
  return `inset ${-d}px ${-d}px ${b}px rgba(255,255,255,${el.emboss.highlightOpacity}), inset ${d}px ${d}px ${b}px rgba(0,0,0,${el.emboss.shadowOpacity})`;
}

function boxEffectStyle(el: UIElement) {
  return [shadowCss(el), embossCss(el)].filter(Boolean).join(', ') || undefined;
}

function svgEffectStyle(el: UIElement): React.CSSProperties | undefined {
  const filters: string[] = [];
  if (el.shadow?.enabled) {
    filters.push(`drop-shadow(${el.shadow.x}px ${el.shadow.y}px ${el.shadow.blur}px ${el.shadow.color}${Math.round(Math.max(0, Math.min(1, el.shadow.opacity)) * 255).toString(16).padStart(2, '0')})`);
  }
  if (el.emboss?.enabled) {
    const d = Math.max(1, el.emboss.depth);
    const b = Math.max(1, el.emboss.softness);
    filters.push(`drop-shadow(${-d}px ${-d}px ${b}px rgba(255,255,255,${el.emboss.highlightOpacity}))`);
    filters.push(`drop-shadow(${d}px ${d}px ${b}px rgba(0,0,0,${el.emboss.shadowOpacity}))`);
  }
  return filters.length ? { filter: filters.join(' ') } : undefined;
}

function basicShape(el: UIElement) {
  if (el.kind !== 'shape') return null;
  const id = el.shapeId;
  const isLine = ['line', 'doubleLine'].includes(id);
  const fillValue = !el.fillEnabled || isLine ? 'none' : el.fill;
  const dash = el.strokeStyle === 'dashed' ? '10 7' : el.strokeStyle === 'dotted' ? '1 7' : undefined;
  const strokeLineCap = el.strokeCap ?? 'butt';
  const strokeLineJoin = el.strokeJoin ?? 'round';
  const strokeProps = { strokeDasharray: dash, strokeLinecap: strokeLineCap, strokeLinejoin: strokeLineJoin } as const;
  const common = { fill: fillValue, stroke: el.stroke, strokeWidth: el.strokeWidth, vectorEffect: 'non-scaling-stroke' as const, ...strokeProps };
  const props = { viewBox: '0 0 100 100', preserveAspectRatio: 'none' as const, className: 'shape-svg', style: svgEffectStyle(el) };
  const strokeOnly = { fill: 'none', stroke: el.stroke, strokeWidth: Math.max(1, el.strokeWidth || 1), vectorEffect: 'non-scaling-stroke' as const, ...strokeProps };


  if (id === 'freehand') return <svg viewBox={`0 0 ${Math.max(1, el.w)} ${Math.max(1, el.h)}`} preserveAspectRatio="none" className="shape-svg" style={svgEffectStyle(el)}><path d={el.pathData ?? `M0 ${el.h/2} C${el.w*.2} ${el.h*.1} ${el.w*.45} ${el.h*.9} ${el.w*.7} ${el.h*.45} S${el.w*.9} ${el.h*.65} ${el.w} ${el.h*.25}`} fill="none" stroke={el.stroke || el.fill} strokeWidth={Math.max(1, el.strokeWidth || 4)} strokeLinecap={el.strokeCap ?? 'round'} strokeLinejoin={el.strokeJoin ?? 'round'} strokeDasharray={dash} /></svg>;

  if (id === 'line') return <svg {...props}><line x1="0" y1="50" x2="100" y2="50" stroke={el.stroke || el.fill} strokeWidth={Math.max(1, el.strokeWidth || 4)} strokeLinecap={el.strokeCap ?? 'round'} strokeDasharray={dash} /></svg>;
  if (id === 'doubleLine') return <svg {...props}><line x1="0" y1="35" x2="100" y2="35" stroke={el.stroke || el.fill} strokeWidth={Math.max(1, el.strokeWidth || 4)} strokeLinecap={el.strokeCap ?? 'round'} strokeDasharray={dash} /><line x1="0" y1="65" x2="100" y2="65" stroke={el.stroke || el.fill} strokeWidth={Math.max(1, el.strokeWidth || 4)} strokeLinecap={el.strokeCap ?? 'round'} strokeDasharray={dash} /></svg>;

  switch (id) {
    case 'rect':
    case 'roundRect':
      return <svg {...props}><rect x="0" y="0" width="100" height="100" rx={Math.min(el.radius, 50)} {...common} /></svg>;
    case 'circle':
    case 'ellipse':
      return <svg {...props}><ellipse cx="50" cy="50" rx="50" ry="50" {...common} /></svg>;
    case 'triangle': return <svg {...props}><polygon points="50,0 100,100 0,100" {...common} /></svg>;
    case 'rightTriangle': return <svg {...props}><polygon points="0,0 100,100 0,100" {...common} /></svg>;
    case 'diamond': return <svg {...props}><polygon points="50,0 100,50 50,100 0,50" {...common} /></svg>;
    case 'pentagon': return <svg {...props}><polygon points="50,0 100,38 81,100 19,100 0,38" {...common} /></svg>;
    case 'hexagon': return <svg {...props}><polygon points="25,0 75,0 100,50 75,100 25,100 0,50" {...common} /></svg>;
    case 'octagon': return <svg {...props}><polygon points="30,0 70,0 100,30 100,70 70,100 30,100 0,70 0,30" {...common} /></svg>;
    case 'star': return <svg {...props}><polygon points="50,0 62,35 100,35 69,57 81,95 50,72 19,95 31,57 0,35 38,35" {...common} /></svg>;
    case 'heart': return <svg {...props}><path d="M50 98C18 70 0 52 0 28 0 11 13 0 30 0c9 0 16 4 20 12C54 4 61 0 70 0c17 0 30 11 30 28 0 24-18 42-50 70Z" {...common} /></svg>;
    case 'speech': return <svg {...props}><path d="M0 0h100v72H42L20 100V72H0V0Z" {...common} /></svg>;
    case 'cloud': return <svg {...props}><path d="M24 88h54c14 0 22-10 22-23 0-12-10-22-22-22h-3C70 21 54 4 34 10 18 15 8 29 8 47 3 51 0 59 0 68c0 13 10 20 24 20Z" {...common} /></svg>;
    case 'capsule': return <svg {...props}><rect x="0" y="0" width="100" height="100" rx="50" {...common} /></svg>;
    case 'parallelogram': return <svg {...props}><polygon points="25,0 100,0 75,100 0,100" {...common} /></svg>;
    case 'trapezoid': return <svg {...props}><polygon points="22,0 78,0 100,100 0,100" {...common} /></svg>;
    case 'arrowRight': return <svg {...props}><path d="M0 30h58V0l42 50-42 50V70H0V30Z" {...common} /></svg>;
    case 'arrowLeft': return <svg {...props}><path d="M100 30H42V0L0 50l42 50V70h58V30Z" {...common} /></svg>;
    case 'arrowUp': return <svg {...props}><path d="M30 100V42H0L50 0l50 42H70v58H30Z" {...common} /></svg>;
    case 'arrowDown': return <svg {...props}><path d="M30 0v58H0l50 42 50-42H70V0H30Z" {...common} /></svg>;
    case 'plus': return <svg {...props}><path d="M37 0h26v37h37v26H63v37H37V63H0V37h37V0Z" {...common} /></svg>;
    case 'cross': return <svg {...props}><path d="M14 0 50 36 86 0l14 14-36 36 36 36-14 14-36-36-36 36L0 86l36-36L0 14 14 0Z" {...common} /></svg>;
    case 'chevron': return <svg {...props}><path d="M0 0 100 50 0 100 28 50 0 0Z" {...common} /></svg>;
    case 'donut': return <svg {...props}><path d="M50 0A50 50 0 1 1 49.9 0M50 26A24 24 0 1 0 50 74A24 24 0 1 0 50 26" fillRule="evenodd" {...common} /></svg>;
    case 'semiCircle': return <svg {...props}><path d="M0 100A50 50 0 0 1 100 100Z" {...common} /></svg>;
    case 'pie': return <svg {...props}><path d="M50 50L50 0A50 50 0 1 1 6.7 75Z" {...common} /></svg>;
    case 'frame': return <svg {...props}><rect x="0" y="0" width="100" height="100" rx={Math.min(el.radius, 30)} {...strokeOnly} /><rect x="6" y="6" width="88" height="88" rx={Math.max(0, Math.min(el.radius - 4, 24))} fill="none" stroke={el.stroke} strokeWidth="1" opacity=".35" /></svg>;
    case 'section': return <svg {...props}><rect x="0" y="0" width="100" height="100" rx={Math.min(el.radius, 24)} {...common} /><line x1="0" y1="22" x2="100" y2="22" stroke={el.stroke} strokeWidth="1" opacity=".55" /></svg>;
    case 'browserWindow': return <svg {...props}><rect x="0" y="0" width="100" height="100" rx={Math.min(el.radius, 18)} {...common} /><rect x="0" y="0" width="100" height="16" rx={Math.min(el.radius, 18)} fill="rgba(255,255,255,.16)"/><circle cx="8" cy="8" r="2.2" fill="#fb7185"/><circle cx="16" cy="8" r="2.2" fill="#fbbf24"/><circle cx="24" cy="8" r="2.2" fill="#34d399"/></svg>;
    case 'mobileFrame': return <svg {...props}><rect x="0" y="0" width="100" height="100" rx="14" {...common} /><rect x="38" y="4" width="24" height="3" rx="2" fill="rgba(255,255,255,.35)"/><rect x="38" y="93" width="24" height="2.5" rx="2" fill="rgba(255,255,255,.28)"/></svg>;
    case 'tooltipBox': return <svg {...props}><path d="M0 0H100V78H58L50 100L42 78H0Z" {...common} /></svg>;
    case 'tag': return <svg {...props}><path d="M0 0H76L100 50L76 100H0Z" {...common}/><circle cx="76" cy="50" r="6" fill="rgba(255,255,255,.35)"/></svg>;
    case 'checkboxShape': return <svg {...props}><rect x="8" y="8" width="84" height="84" rx="14" {...common}/><path d="M28 52L44 68L74 34" fill="none" stroke={el.textColor || '#fff'} strokeWidth="8" strokeLinecap={el.strokeCap ?? 'round'} strokeLinejoin="round"/></svg>;
    case 'radioShape': return <svg {...props}><circle cx="50" cy="50" r="48" {...common}/><circle cx="50" cy="50" r="22" fill={el.textColor || '#fff'}/></svg>;
    case 'sliderShape': return <svg {...props}><line x1="8" y1="50" x2="92" y2="50" stroke={el.stroke} strokeWidth="10" strokeLinecap={el.strokeCap ?? 'round'}/><circle cx="62" cy="50" r="18" fill={el.fillEnabled ? el.fill : '#fff'} stroke={el.stroke} strokeWidth="3"/></svg>;
    case 'tableCell': return <svg {...props}><rect x="0" y="0" width="100" height="100" rx={Math.min(el.radius, 10)} {...common}/><path d="M33 0V100M66 0V100M0 33H100M0 66H100" stroke={el.stroke} strokeWidth="1" opacity=".55"/></svg>;
    case 'listRow': return <svg {...props}><rect x="0" y="0" width="100" height="100" rx={Math.min(el.radius, 16)} {...common}/><circle cx="14" cy="50" r="7" fill="rgba(255,255,255,.45)"/><rect x="28" y="32" width="58" height="8" rx="4" fill="rgba(255,255,255,.45)"/><rect x="28" y="54" width="44" height="7" rx="4" fill="rgba(255,255,255,.25)"/></svg>;
    default:
      return <svg {...props}><rect x="0" y="0" width="100" height="100" rx={Math.min(el.radius, 50)} {...common} /></svg>;
  }
}
function ShapeView({ el }: { el: UIElement }) {
  if (el.kind !== 'shape') return null;
  if (el.shapeId.startsWith('ui')) {
    const circle = ['ui3dEllipse', 'uiCircleButton', 'uiSphere', 'uiRing', 'uiKnob', 'uiCylinder'].includes(el.shapeId);
    const ring = el.shapeId === 'uiRing';
    const noFill = !el.fillEnabled;
    const button = ['uiPrimaryButton','uiSecondaryButton','uiDangerButton','uiGhostButton','uiNeonButton','uiSoftButton','uiSegmentButton','uiToolbarButton','uiGlossButton','uiFloatingButton','uiIconButton','uiSplitButton','uiChipButton','uiTabButton','uiGlassButton','uiOutlineButton'].includes(el.shapeId);
    const glass = ['uiGlassPanel', 'uiCardGlass'].includes(el.shapeId);
    const raisedCard = ['uiShadowCard', 'uiCardRaised'].includes(el.shapeId);
    let background = noFill || ring ? 'transparent' : `linear-gradient(180deg, rgba(255,255,255,.42), rgba(255,255,255,.06) 38%, rgba(0,0,0,.22) 100%), ${el.fill}`;
    let boxShadow = boxEffectStyle(el) ?? 'inset 0 1px 0 rgba(255,255,255,.28), 0 14px 30px rgba(0,0,0,.28)';
    let border = ring ? `${Math.max(6, Math.min(el.w, el.h) * .16)}px solid ${el.fill}` : el.strokeWidth ? `${el.strokeWidth}px solid ${el.stroke}` : undefined;

    if (el.shapeId === 'ui3dRect' || el.shapeId === 'ui3dRoundRect') {
      background = `linear-gradient(145deg, rgba(255,255,255,.45) 0%, rgba(255,255,255,.08) 34%, rgba(0,0,0,.22) 100%), ${el.fill}`;
      boxShadow = boxEffectStyle(el) ?? 'inset 0 1px 0 rgba(255,255,255,.38), inset 0 -14px 24px rgba(0,0,0,.22), 0 16px 32px rgba(0,0,0,.32)';
    }
    if (el.shapeId === 'ui3dEllipse' || el.shapeId === 'uiSphere' || el.shapeId === 'uiCircleButton') {
      background = `radial-gradient(circle at 30% 24%, rgba(255,255,255,.85), rgba(255,255,255,.38) 16%, ${el.fill} 45%, rgba(0,0,0,.42) 100%)`;
      boxShadow = boxEffectStyle(el) ?? 'inset -12px -14px 28px rgba(0,0,0,.38), inset 6px 6px 14px rgba(255,255,255,.22), 0 16px 30px rgba(0,0,0,.3)';
    }
    if (glass) {
      background = `linear-gradient(135deg, rgba(255,255,255,.22), rgba(255,255,255,.06)), ${el.fill}`;
      boxShadow = boxEffectStyle(el) ?? 'inset 0 1px 0 rgba(255,255,255,.36), 0 18px 42px rgba(0,0,0,.28)';
      border = border ?? '1px solid rgba(255,255,255,.24)';
    }
    if (raisedCard) {
      background = `linear-gradient(180deg, rgba(255,255,255,.10), rgba(0,0,0,.06)), ${el.fill}`;
      boxShadow = boxEffectStyle(el) ?? '0 22px 54px rgba(0,0,0,.36), inset 0 1px 0 rgba(255,255,255,.14)';
    }
    if (el.shapeId === 'uiInsetBar' || el.shapeId === 'uiInput') {
      background = el.fill;
      boxShadow = boxEffectStyle(el) ?? 'inset 0 8px 18px rgba(0,0,0,.42), inset 0 1px 0 rgba(255,255,255,.1)';
    }
    if (el.shapeId === 'uiNeonButton') {
      background = `linear-gradient(180deg, rgba(34,211,238,.22), rgba(15,23,42,.96)), ${el.fill}`;
      boxShadow = boxEffectStyle(el) ?? '0 0 0 1px rgba(34,211,238,.65), 0 0 24px rgba(34,211,238,.38), inset 0 1px 0 rgba(255,255,255,.25)';
      border = '1px solid rgba(34,211,238,.75)';
    }
    if (el.shapeId === 'uiGhostButton' || el.shapeId === 'uiOutlineButton') {
      background = 'rgba(255,255,255,.025)';
      border = `1px solid ${el.stroke}`;
      boxShadow = boxEffectStyle(el) ?? 'inset 0 1px 0 rgba(255,255,255,.10)';
    }
    if (el.shapeId === 'uiSoftButton') {
      background = 'linear-gradient(180deg, #F0F9FF, #BAE6FD)';
      boxShadow = boxEffectStyle(el) ?? 'inset 0 1px 0 rgba(255,255,255,.82), 0 10px 22px rgba(14,165,233,.22)';
    }

    if (el.shapeId === 'uiFloatingButton' || el.shapeId === 'uiIconButton') {
      background = noFill ? 'transparent' : `radial-gradient(circle at 32% 24%, rgba(255,255,255,.82), rgba(255,255,255,.28) 20%, ${el.fill} 48%, rgba(0,0,0,.35) 100%)`;
      border = el.strokeWidth ? `${el.strokeWidth}px solid ${el.stroke}` : '1px solid rgba(255,255,255,.22)';
      boxShadow = boxEffectStyle(el) ?? '0 14px 30px rgba(0,0,0,.34), inset 0 1px 0 rgba(255,255,255,.35)';
    }
    if (el.shapeId === 'uiSplitButton') {
      background = noFill ? 'transparent' : `linear-gradient(180deg, rgba(255,255,255,.24), rgba(0,0,0,.14)), ${el.fill}`;
      boxShadow = boxEffectStyle(el) ?? '0 10px 20px rgba(0,0,0,.24), inset -46px 0 0 rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.25)';
    }
    if (el.shapeId === 'uiChipButton' || el.shapeId === 'uiTabButton') {
      background = noFill ? 'transparent' : `linear-gradient(180deg, rgba(255,255,255,.28), rgba(255,255,255,.06)), ${el.fill}`;
      boxShadow = boxEffectStyle(el) ?? 'inset 0 1px 0 rgba(255,255,255,.28), 0 8px 16px rgba(0,0,0,.18)';
    }
    if (el.shapeId === 'uiGlassButton') {
      background = noFill ? 'transparent' : `linear-gradient(135deg, rgba(255,255,255,.24), rgba(255,255,255,.06)), ${el.fill}`;
      border = border ?? '1px solid rgba(255,255,255,.28)';
      boxShadow = boxEffectStyle(el) ?? '0 12px 28px rgba(0,0,0,.26), inset 0 1px 0 rgba(255,255,255,.32)';
    }
    if (noFill && !ring) {
      background = 'transparent';
      border = border ?? (el.strokeWidth ? `${el.strokeWidth}px solid ${el.stroke}` : '1px solid rgba(255,255,255,.22)');
    }
    if (button) {
      boxShadow = boxShadow ?? '0 12px 24px rgba(0,0,0,.25)';
    }

    return <div className={`shape-3d ${button ? 'ui-button-shape' : ''}`} style={{ borderRadius: circle ? '50%' : el.radius, background, border, color: el.textColor, fontSize: el.fontSize, fontWeight: el.fontWeight, boxShadow, textAlign: el.textAlign, alignItems: el.verticalAlign === 'start' ? 'flex-start' : el.verticalAlign === 'end' ? 'flex-end' : 'center', justifyContent: el.textAlign === 'left' ? 'flex-start' : el.textAlign === 'right' ? 'flex-end' : 'center', padding: el.textAlign === 'left' || el.textAlign === 'right' ? '0 14px' : undefined }}>{el.shapeId === 'uiToggle' ? <span className="toggle-thumb"/> : el.text}</div>;
  }
  return basicShape(el);
}

export function ResizeHandles({ zoom, onDown }: { zoom: number; onDown: (e: React.PointerEvent, h: ResizeHandle) => void }) {
  const size = 14 * 100 / Math.max(10, zoom);
  const half = size / -2;
  const handles: { h: ResizeHandle; style: React.CSSProperties; cursor: string }[] = [
    { h:'nw', style:{left:half, top:half}, cursor:'nwse-resize' }, { h:'n', style:{left:`calc(50% + ${half}px)`, top:half}, cursor:'ns-resize' }, { h:'ne', style:{right:half, top:half}, cursor:'nesw-resize' },
    { h:'e', style:{right:half, top:`calc(50% + ${half}px)`}, cursor:'ew-resize' }, { h:'se', style:{right:half, bottom:half}, cursor:'nwse-resize' }, { h:'s', style:{left:`calc(50% + ${half}px)`, bottom:half}, cursor:'ns-resize' },
    { h:'sw', style:{left:half, bottom:half}, cursor:'nesw-resize' }, { h:'w', style:{left:half, top:`calc(50% + ${half}px)`}, cursor:'ew-resize' }
  ];
  return <>{handles.map(item => <button key={item.h} className="resize-handle" style={{...item.style, width:size, height:size, cursor:item.cursor}} onPointerDown={(e)=>onDown(e,item.h)} />)}</>;
}

export function ElementView({ el, selected, zoom, showImageControls, onPointerDown, onDoubleClick, onResizeStart, onContextMenu }: { el: UIElement; selected: boolean; zoom: number; showImageControls?: boolean; onPointerDown: (e: React.PointerEvent, id: string) => void; onDoubleClick: (id: string) => void; onResizeStart: (e: React.PointerEvent, id: string, h: ResizeHandle) => void; onContextMenu: (e: MouseEvent, id: string) => void; }) {
  if (!el.visible) return null;
  const style: React.CSSProperties = { left: el.x, top: el.y, width: el.w, height: el.h, opacity: el.opacity, transform: `rotate(${el.rotate}deg)` };
  return <div draggable={false} className={`canvas-element ${selected ? 'selected' : ''} ${el.locked ? 'locked' : ''}`} style={style} onPointerDown={(e)=>onPointerDown(e, el.id)} onContextMenu={(e)=>onContextMenu(e, el.id)} onDoubleClick={()=>onDoubleClick(el.id)}>
    {el.kind === 'shape' && <ShapeView el={el}/>}
    {el.kind === 'shape' && !el.shapeId.startsWith('ui') && el.text && <div className="shape-text-overlay" style={{ color: el.textColor, fontSize: el.fontSize, fontFamily: el.fontFamily, fontWeight: el.fontWeight, fontStyle: el.fontStyle, textAlign: el.textAlign, letterSpacing: el.letterSpacing, lineHeight: el.lineHeight, textDecoration: el.textDecoration, alignItems: el.verticalAlign === 'start' ? 'flex-start' : el.verticalAlign === 'end' ? 'flex-end' : 'center', justifyContent: el.textAlign === 'left' ? 'flex-start' : el.textAlign === 'right' ? 'flex-end' : 'center' }}><span>{el.text}</span></div>} 
    {el.kind === 'text' && <div className="text-el" style={{ background: el.fillEnabled ? el.fill : 'transparent', borderRadius: el.radius, color: el.textColor, fontSize: el.fontSize, fontFamily: el.fontFamily, fontWeight: el.fontWeight, fontStyle: el.fontStyle, textAlign: el.textAlign, letterSpacing: el.letterSpacing, lineHeight: el.lineHeight, textDecoration: el.textDecoration, alignItems: el.verticalAlign === 'center' ? 'center' : el.verticalAlign === 'end' ? 'flex-end' : 'flex-start', justifyContent: el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start', boxShadow: boxEffectStyle(el) }}><span>{el.text}</span></div>}
    {el.kind === 'icon' && <div className="icon-el" style={{ background: el.fillEnabled ? el.fill : 'transparent', border: el.strokeWidth ? `${el.strokeWidth}px solid ${el.stroke}` : undefined, borderRadius: el.radius, color: el.textColor, fontSize: el.fontSize, fontFamily: el.fontFamily, fontWeight: el.fontWeight, boxShadow: boxEffectStyle(el), textShadow: (!el.fillEnabled || el.fill === 'transparent') ? shadowCss(el) : undefined }}>
      {el.iconSource === 'colorSvg' && el.svgColorPaths?.length ? (
        <svg className="svg-icon-el color-svg-icon-el" viewBox={el.svgViewBox ?? '0 0 24 24'} aria-hidden="true">
          {el.svgColorPaths.map((path, idx) => <path key={idx} d={path.d} fill={path.fill ?? 'none'} stroke={path.stroke} strokeWidth={path.strokeWidth} opacity={path.opacity} strokeLinecap={path.lineCap} strokeLinejoin={path.lineJoin} />)}
        </svg>
      ) : el.iconSource === 'svg' && el.svgPaths?.length ? (
        <svg className="svg-icon-el" viewBox={el.svgViewBox ?? '0 0 24 24'} aria-hidden="true">
          {el.svgPaths.map((d, idx) => <path key={idx} d={d} />)}
        </svg>
      ) : el.iconSymbol}
    </div>}
    {el.kind === 'image' && <div className="image-el" style={{ borderRadius: el.imageMask === 'circle' ? '50%' : el.radius, border: el.strokeWidth ? `${el.strokeWidth}px solid ${el.stroke}` : undefined, boxShadow: boxEffectStyle(el) }}><img src={el.src} draggable={false} onDragStart={(e)=>e.preventDefault()} style={{ objectFit: el.objectFit, objectPosition: `${el.objectPositionX}% ${el.objectPositionY}%`, filter: `brightness(${el.brightness}%) contrast(${el.contrast}%) saturate(${el.saturation ?? 100}%) grayscale(${el.grayscale}%) sepia(${el.sepia ?? 0}%) hue-rotate(${el.hueRotate ?? 0}deg) invert(${el.invert ?? 0}%) blur(${el.blur ?? 0}px)` }} />{el.overlayOpacity > 0 && <div className="image-overlay" style={{ background: el.overlayColor, opacity: el.overlayOpacity }} />}{showImageControls && <><div className="focal-point" style={{ left: `${el.objectPositionX}%`, top: `${el.objectPositionY}%` }}/><div className="crop-box" style={{ left:`${el.crop.x}%`, top:`${el.crop.y}%`, width:`${el.crop.w}%`, height:`${el.crop.h}%` }}/></>}</div>}
    {selected && !el.locked && <ResizeHandles zoom={zoom} onDown={(e,h)=>onResizeStart(e,el.id,h)} />}
  </div>;
}
