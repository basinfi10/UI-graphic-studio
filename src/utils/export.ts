import { tokensToCss } from '../data/styles';
import type { DesignTokens, SaveMode, UIElement } from '../types/editor';

export function escapeXml(v: unknown) { return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function isSolidColor(v?: string) { return typeof v === 'string' && /^#([\da-fA-F]{3}|[\da-fA-F]{6}|[\da-fA-F]{8})$/.test(v); }
function color(v: string | undefined, fallback: string) { return isSolidColor(v) ? String(v) : fallback; }
function css(v: string | undefined, fallback = 'transparent') { return v || fallback; }

function textSvg(el: UIElement, x: number, y: number, w: number, h: number, center = false) {
  const text = el.kind === 'icon' ? el.iconSymbol : 'text' in el ? el.text ?? '' : '';
  const lines = String(text).split('\n');
  const fs = 'fontSize' in el ? el.fontSize ?? 16 : 16;
  const lh = 'lineHeight' in el ? el.lineHeight ?? 1.2 : 1.2;
  const align = center ? 'center' : 'textAlign' in el ? el.textAlign ?? 'left' : 'center';
  const anchor = align === 'right' ? 'end' : align === 'center' ? 'middle' : 'start';
  const tx = align === 'right' ? x + w - 8 : align === 'center' ? x + w / 2 : x + 8;
  const va = center ? 'center' : 'verticalAlign' in el ? el.verticalAlign ?? 'start' : 'center';
  const blockH = lines.length * fs * lh;
  const ty = va === 'center' ? y + (h - blockH) / 2 + fs : va === 'end' ? y + h - blockH - 8 + fs : y + 8 + fs;
  const deco = 'textDecoration' in el && el.textDecoration && el.textDecoration !== 'none' ? ` text-decoration="${el.textDecoration}"` : '';
  const spacing = 'letterSpacing' in el && el.letterSpacing ? ` letter-spacing="${el.letterSpacing}"` : '';
  const family = 'fontFamily' in el ? el.fontFamily ?? 'Malgun Gothic, Arial, sans-serif' : 'Malgun Gothic, Arial, sans-serif';
  const weight = 'fontWeight' in el ? el.fontWeight ?? 700 : 700;
  return `<text x="${tx}" y="${ty}" fill="${color('textColor' in el ? el.textColor : '#fff', '#fff')}" font-family="${escapeXml(family)}" font-size="${fs}" font-weight="${weight}" text-anchor="${anchor}"${deco}${spacing}>${lines.map((line, i) => `<tspan x="${tx}" dy="${i ? fs * lh : 0}">${escapeXml(line)}</tspan>`).join('')}</text>`;
}


function svgIconMarkup(el: UIElement, x: number, y: number) {
  if (el.kind !== 'icon') return '';
  const bg = el.fillEnabled && el.fill && el.fill !== 'transparent' ? `<rect x="${x}" y="${y}" width="${el.w}" height="${el.h}" rx="${el.radius}" fill="${color(el.fill, 'transparent')}"/>` : '';
  const border = el.strokeWidth ? `<rect x="${x}" y="${y}" width="${el.w}" height="${el.h}" rx="${el.radius}" fill="none" stroke="${color(el.stroke, '#ffffff')}" stroke-width="${el.strokeWidth}"/>` : '';
  const pad = Math.max(8, Math.min(el.w, el.h) * 0.18);
  const ix = x + pad, iy = y + pad, iw = Math.max(1, el.w - pad * 2), ih = Math.max(1, el.h - pad * 2);
  if (el.iconSource === 'colorSvg' && el.svgColorPaths?.length) {
    const paths = el.svgColorPaths.map((path) => `<path d="${escapeXml(path.d)}"${path.fill ? ` fill="${color(path.fill, 'none')}"` : ' fill="none"'}${path.stroke ? ` stroke="${color(path.stroke, '#ffffff')}"` : ''}${path.strokeWidth ? ` stroke-width="${path.strokeWidth}"` : ''}${path.opacity !== undefined ? ` opacity="${path.opacity}"` : ''}${path.lineCap ? ` stroke-linecap="${path.lineCap}"` : ''}${path.lineJoin ? ` stroke-linejoin="${path.lineJoin}"` : ''}/>`).join('');
    return `${bg}${border}<svg x="${ix}" y="${iy}" width="${iw}" height="${ih}" viewBox="${escapeXml(el.svgViewBox ?? '0 0 24 24')}">${paths}</svg>`;
  }
  if (el.iconSource !== 'svg' || !el.svgPaths?.length) return '';
  const stroke = color(el.textColor, '#ffffff');
  return `${bg}${border}<svg x="${ix}" y="${iy}" width="${iw}" height="${ih}" viewBox="${escapeXml(el.svgViewBox ?? '0 0 24 24')}" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${el.svgPaths.map((d) => `<path d="${escapeXml(d)}"/>`).join('')}</svg>`;
}

function shapeSvg(el: UIElement, x: number, y: number) {
  const id = el.kind === 'shape' ? el.shapeId : 'rect';
  const w = el.w, h = el.h;
  if (id.startsWith('ui')) {
    const noFill = !el.fillEnabled;
    const gid = `grad_${el.id.replace(/[^a-zA-Z0-9_]/g, '_')}`;
    const fill = color(el.fill, '#2563EB');
    const round = Math.min(el.radius, w / 2, h / 2);
    const defs = `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fff" stop-opacity=".45"/><stop offset="42%" stop-color="${fill}"/><stop offset="100%" stop-color="#000" stop-opacity=".25"/></linearGradient><filter id="sh_${gid}" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="14" stdDeviation="10" flood-color="#000" flood-opacity=".3"/></filter></defs>`;
    if (['ui3dEllipse','uiCircleButton','uiSphere','uiKnob','uiCylinder'].includes(id)) return `${defs}<ellipse cx="${x+w/2}" cy="${y+h/2}" rx="${w/2}" ry="${h/2}" fill="${noFill ? 'none' : `url(#${gid})`}" filter="url(#sh_${gid})"/>`;
    if (id === 'uiRing') return `${defs}<ellipse cx="${x+w/2}" cy="${y+h/2}" rx="${w/2}" ry="${h/2}" fill="none" stroke="url(#${gid})" stroke-width="${Math.max(6, Math.min(w,h)*.18)}"/>`;
    return `${defs}<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${round}" fill="${noFill ? 'none' : `url(#${gid})`}" filter="url(#sh_${gid})"/>`;
  }
  const fill = ['line','doubleLine'].includes(id) || !el.fillEnabled ? 'none' : color(el.fill, '#2563EB');
  const stroke = color(el.stroke, '#93C5FD');
  const sw = Math.max(0, el.strokeWidth ?? 0);
  const dash = el.strokeStyle === 'dashed' ? '10 7' : el.strokeStyle === 'dotted' ? '1 7' : '';
  const lineCap = el.strokeCap ?? 'butt';
  const lineJoin = el.strokeJoin ?? 'round';
  const strokeExtra = `${dash ? ` stroke-dasharray="${dash}"` : ''} stroke-linecap="${lineCap}" stroke-linejoin="${lineJoin}"`;
  const common = ` fill="${fill}"${sw ? ` stroke="${stroke}" stroke-width="${sw}"${strokeExtra}` : ''}`;
  if (id === 'freehand') return `<path d="${escapeXml((el.kind === 'shape' && el.pathData) || '')}" transform="translate(${x} ${y})" fill="none" stroke="${stroke}" stroke-width="${Math.max(1, sw || 4)}" stroke-linecap="${lineCap}" stroke-linejoin="${lineJoin}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
  if (id === 'line') return `<line x1="${x}" y1="${y+h/2}" x2="${x+w}" y2="${y+h/2}" stroke="${color(el.fill, stroke)}" stroke-width="${Math.max(2,h*.35)}" stroke-linecap="${lineCap}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
  if (id === 'doubleLine') return `<g stroke="${color(el.fill, stroke)}" stroke-width="${Math.max(2,h*.22)}" stroke-linecap="${lineCap}"${dash ? ` stroke-dasharray="${dash}"` : ''}><line x1="${x}" y1="${y+h*.35}" x2="${x+w}" y2="${y+h*.35}"/><line x1="${x}" y1="${y+h*.65}" x2="${x+w}" y2="${y+h*.65}"/></g>`;
  if (id === 'circle' || id === 'ellipse') return `<ellipse cx="${x+w/2}" cy="${y+h/2}" rx="${w/2}" ry="${h/2}"${common}/>`;
  if (id === 'triangle') return `<polygon points="${x+w/2},${y} ${x+w},${y+h} ${x},${y+h}"${common}/>`;
  if (id === 'diamond') return `<polygon points="${x+w/2},${y} ${x+w},${y+h/2} ${x+w/2},${y+h} ${x},${y+h/2}"${common}/>`;
  if (id === 'star') return `<polygon points="${x+w*.5},${y} ${x+w*.62},${y+h*.35} ${x+w},${y+h*.35} ${x+w*.69},${y+h*.57} ${x+w*.81},${y+h*.95} ${x+w*.5},${y+h*.72} ${x+w*.19},${y+h*.95} ${x+w*.31},${y+h*.57} ${x},${y+h*.35} ${x+w*.38},${y+h*.35}"${common}/>`;
  if (id === 'arrowRight') return `<path d="M${x} ${y+h*.3}H${x+w*.58}V${y}L${x+w} ${y+h*.5}L${x+w*.58} ${y+h}V${y+h*.7}H${x}Z"${common}/>`;
  const r = Math.min(el.radius ?? 0, w/2, h/2);
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"${common}/>`;
}

function effectFilterSvg(el: UIElement) {
  const id = `fx_${el.id.replace(/[^a-zA-Z0-9_]/g, '_')}`;
  const parts: string[] = [];
  if (el.shadow?.enabled) parts.push(`<feDropShadow dx="${el.shadow.x}" dy="${el.shadow.y}" stdDeviation="${Math.max(0, el.shadow.blur / 2)}" flood-color="${color(el.shadow.color, '#000000')}" flood-opacity="${Math.max(0, Math.min(1, el.shadow.opacity))}"/>`);
  if (el.emboss?.enabled) {
    const d = Math.max(1, el.emboss.depth);
    const ss = Math.max(1, el.emboss.softness / 2);
    parts.push(`<feDropShadow dx="${-d}" dy="${-d}" stdDeviation="${ss}" flood-color="#ffffff" flood-opacity="${el.emboss.highlightOpacity}"/>`);
    parts.push(`<feDropShadow dx="${d}" dy="${d}" stdDeviation="${ss}" flood-color="#000000" flood-opacity="${el.emboss.shadowOpacity}"/>`);
  }
  if (!parts.length) return { defs: '', attr: '' };
  return { defs: `<defs><filter id="${id}" x="-60%" y="-60%" width="220%" height="220%">${parts.join('')}</filter></defs>`, attr: ` filter="url(#${id})"` };
}

export function elementToSvg(el: UIElement, layerOnly = false) {
  const x = layerOnly ? 0 : el.x, y = layerOnly ? 0 : el.y;
  const cx = x + el.w / 2, cy = y + el.h / 2;
  const fx = effectFilterSvg(el);
  let body = fx.defs;
  if (el.kind === 'shape') { body += shapeSvg(el, x, y); if (el.text) body += textSvg(el, x, y, el.w, el.h, true); }
  if (el.kind === 'text') { if (el.fillEnabled && el.fill !== 'transparent') body += `<rect x="${x}" y="${y}" width="${el.w}" height="${el.h}" rx="${el.radius}" fill="${color(el.fill,'transparent')}"/>`; body += textSvg(el, x, y, el.w, el.h); }
  if (el.kind === 'icon') { body += (el.iconSource === 'svg' && el.svgPaths?.length) || (el.iconSource === 'colorSvg' && el.svgColorPaths?.length) ? svgIconMarkup(el, x, y) : textSvg(el, x, y, el.w, el.h, true); }
  if (el.kind === 'image') {
    const clip = `clip_${el.id.replace(/[^a-zA-Z0-9_]/g, '_')}`;
    const r = el.imageMask === 'circle' ? Math.min(el.w, el.h)/2 : el.radius;
    const filter = `brightness(${el.brightness}%) contrast(${el.contrast}%) saturate(${el.saturation ?? 100}%) grayscale(${el.grayscale}%) sepia(${el.sepia ?? 0}%) hue-rotate(${el.hueRotate ?? 0}deg) invert(${el.invert ?? 0}%) blur(${el.blur ?? 0}px)`;
    body += `<defs><clipPath id="${clip}"><rect x="${x}" y="${y}" width="${el.w}" height="${el.h}" rx="${r}"/></clipPath></defs><image href="${escapeXml(el.src)}" x="${x}" y="${y}" width="${el.w}" height="${el.h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clip})" style="filter:${filter}"/>`;
    if (el.overlayOpacity) body += `<rect x="${x}" y="${y}" width="${el.w}" height="${el.h}" rx="${r}" fill="${color(el.overlayColor,'#000')}" opacity="${el.overlayOpacity}"/>`;
  }
  return `<g opacity="${el.opacity}" transform="rotate(${el.rotate} ${cx} ${cy})"${fx.attr}>${body}</g>`;
}

export function buildSvg(elements: UIElement[], width: number, height: number, tokens: DesignTokens, layerOnly = false, includeBg = true, fontCss = '') {
  const bg = includeBg ? `<rect width="${width}" height="${height}" fill="${color(tokens.background, '#020617')}"/>` : '';
  const style = `<style>${tokensToCss(tokens)}${fontCss}</style>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${style}${bg}${elements.filter(e=>e.visible).map((el) => elementToSvg(el, layerOnly)).join('')}</svg>`;
}
export function buildLayerSvg(element: UIElement, tokens: DesignTokens, padding = 16, fontCss = '') {
  const pad = Math.max(padding, Math.ceil((element.strokeWidth ?? 0) / 2) + 8);
  const width = Math.max(1, Math.round(element.w + pad * 2));
  const height = Math.max(1, Math.round(element.h + pad * 2));
  const style = `<style>${tokensToCss(tokens)}${fontCss}</style>`;
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" overflow="visible">${style}<g transform="translate(${pad} ${pad})">${elementToSvg(element, true)}</g></svg>`,
    width,
    height,
  };
}

export async function saveBlob(blob: Blob, filename: string, mimeType: string): Promise<SaveMode> {
  try {
    const win = window as unknown as { showSaveFilePicker?: (options: { suggestedName: string; types: Array<{ description: string; accept: Record<string, string[]> }> }) => Promise<{ createWritable: () => Promise<{ write: (blob: Blob) => Promise<void>; close: () => Promise<void> }> }> };
    const ext = filename.includes('.') ? `.${filename.split('.').pop()}` : '.dat';
    if (window.isSecureContext && typeof win.showSaveFilePicker === 'function') {
      const handle = await win.showSaveFilePicker({ suggestedName: filename, types: [{ description: mimeType, accept: { [mimeType]: [ext] } }] });
      const writable = await handle.createWritable(); await writable.write(blob); await writable.close(); return 'picked';
    }
  } catch (error) { if ((error as { name?: string })?.name === 'AbortError') return 'cancelled'; }
  try { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),500); return 'download'; } catch { return 'failed'; }
}
export async function saveText(filename: string, text: string, type: string) { return saveBlob(new Blob([text], { type }), filename, type); }
export async function saveSvg(filename: string, svg: string) { return saveBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), filename, 'image/svg+xml'); }
export async function svgToPng(svg: string, width: number, height: number, filename: string): Promise<{ ok: boolean; mode: SaveMode; fallback?: 'svg' }> {
  const image = new Image(); image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  try { await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('load failed')); }); } catch { const mode = await saveSvg(filename.replace(/\.png$/i,'.svg'), svg); return { ok:false, mode, fallback:'svg' }; }
  try { const canvas = document.createElement('canvas'); canvas.width = Math.round(width); canvas.height = Math.round(height); const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('no ctx'); ctx.drawImage(image,0,0,canvas.width,canvas.height); const blob = await new Promise<Blob|null>((r)=>canvas.toBlob(r,'image/png')); if (!blob) throw new Error('no blob'); const mode = await saveBlob(blob, filename, 'image/png'); return { ok: mode === 'picked' || mode === 'download', mode }; } catch { const mode = await saveSvg(filename.replace(/\.png$/i,'.svg'), svg); return { ok:false, mode, fallback:'svg' }; }
}
export function buildHtmlExport(items: UIElement[], width: number, height: number, tokens: DesignTokens) { return `<div class="ui-artboard" style="position:relative;width:${width}px;height:${height}px;background:${tokens.background};overflow:hidden;">\n${items.filter(e=>e.visible).map((el)=>`  <div style="position:absolute;left:${el.x}px;top:${el.y}px;width:${el.w}px;height:${el.h}px;opacity:${el.opacity};transform:rotate(${el.rotate}deg);background:${el.fillEnabled ? css(el.fill) : 'transparent'};border:${el.strokeWidth}px solid ${css(el.stroke)};border-radius:${el.radius}px;color:${'textColor' in el ? el.textColor : tokens.text};display:flex;align-items:center;justify-content:center;box-sizing:border-box;overflow:hidden;">${escapeXml('iconSymbol' in el ? el.iconSymbol : 'text' in el ? el.text : '')}</div>`).join('\n')}\n</div>`; }
export function buildReactExport(items: UIElement[], width: number, height: number, tokens: DesignTokens) { return `export default function ExportedUI(){\n  return (\n    <>\n      ${buildHtmlExport(items,width,height,tokens).replace(/class=/g,'className=').split('\n').join('\n      ')}\n    </>\n  );\n}\n`; }
export function buildTailwindExport(items: UIElement[], width: number, height: number, tokens: DesignTokens) { return `export default function ExportedUI(){\n  return (\n    <div className="relative overflow-hidden" style={{ width:${width}, height:${height}, background:'${tokens.background}' }}>\n${items.filter(e=>e.visible).map(el=>`      <div className="absolute box-border overflow-hidden flex items-center justify-center" style={{ left:${Math.round(el.x)}, top:${Math.round(el.y)}, width:${Math.round(el.w)}, height:${Math.round(el.h)}, borderRadius:${Math.round(el.radius)}, background:'${el.fillEnabled ? css(el.fill) : 'transparent'}', color:'${'textColor' in el ? el.textColor : tokens.text}', opacity:${el.opacity}, transform:'rotate(${el.rotate}deg)' }}>${JSON.stringify('iconSymbol' in el ? el.iconSymbol : 'text' in el ? el.text : '')}</div>`).join('\n')}\n    </div>\n  );\n}\n`; }
