import type { MouseEvent } from 'react';
import { useMemo, useRef, useState } from 'react';
import { builtInComponents, cloneComponentElements } from '../../data/components';
import { iconDefs } from '../../data/icons';
import { imageEffectPresets } from '../../data/imageEffects';
import { createSampleUis } from '../../data/sampleUis';
import { createWebSamples } from '../../data/webSamples';
import { colorSvgIconDefs, svgIconDefs } from '../../data/svgIcons';
import { canvasPresets, defaultTokens, fontFamilies, fontWeights, shapes } from '../../data/shapes';
import { stylePresets, tokensToCss } from '../../data/styles';
import type { CustomComponent, CustomIcon, EditorAction, EditorState, Panel, UIElement } from '../../types/editor';
import { cloneElement, makeColorSvgIcon, makeIcon, makeImage, makeShape, makeSvgIcon, uid } from '../../utils/elements';
import { buildHtmlExport, buildReactExport, buildSvg, buildTailwindExport, saveBlob, saveText } from '../../utils/export';
import { getBounds } from '../../utils/geometry';

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="field"><span>{label}</span>{children}</label>; }
const panels: { id: Panel; label: string; icon: string }[] = [
  {id:'background',label:'배경',icon:'▨'}, {id:'shapes',label:'도형',icon:'▭'}, {id:'icons',label:'아이콘',icon:'✦'}, {id:'iconStudio',label:'아이콘 제작',icon:'🖌'}, {id:'samples',label:'샘플 UI',icon:'▣'}, {id:'webSamples',label:'웹 샘플 레이어',icon:'🌐'}, {id:'components',label:'컴포넌트',icon:'▤'}, {id:'styles',label:'스타일 프리셋',icon:'◐'}, {id:'tokens',label:'디자인 토큰',icon:'🎨'}, {id:'layout',label:'정렬 / 분배',icon:'⇄'}, {id:'layers',label:'레이어',icon:'☰'}, {id:'props',label:'속성',icon:'⚙'}, {id:'canvas',label:'캔버스 / 그리드',icon:'▥'}, {id:'code',label:'코드 Export',icon:'</>'}
];

export function RightPanel({ state, dispatch, onOpenLayerMenu, onCollapse }: { state: EditorState; dispatch: React.Dispatch<EditorAction>; onOpenLayerMenu: (event: MouseEvent, id: string) => void; onCollapse?: () => void }) {
  return <aside className="right-panel">
    <div className="panel-tabs">{panels.map(p=><button key={p.id} title={p.label} aria-label={p.label} data-tip={p.label} className={state.panel===p.id?'active':''} onClick={()=>dispatch({type:'SET_PANEL', panel:p.id})}>{p.icon}</button>)}<button type="button" className="panel-collapse" title="오른쪽 패널 접기" aria-label="오른쪽 패널 접기" onClick={onCollapse}>▶</button></div>
    <div className="panel-body">
      {state.panel === 'background' && <BackgroundPanel state={state} dispatch={dispatch}/>} 
      {state.panel === 'shapes' && <ShapesPanel dispatch={dispatch}/>} 
      {state.panel === 'icons' && <IconsPanel dispatch={dispatch}/>} 
      {state.panel === 'iconStudio' && <IconStudioPanel state={state} dispatch={dispatch}/>} 
      {state.panel === 'samples' && <SamplesPanel state={state} dispatch={dispatch}/>} 
      {state.panel === 'webSamples' && <WebSamplesPanel state={state} dispatch={dispatch}/>} 
      {state.panel === 'components' && <ComponentsPanel state={state} dispatch={dispatch}/>} 
      {state.panel === 'styles' && <StylesPanel state={state} dispatch={dispatch}/>} 
      {state.panel === 'tokens' && <TokensPanel state={state} dispatch={dispatch}/>} 
      {state.panel === 'layout' && <LayoutPanel state={state} dispatch={dispatch}/>} 
      {state.panel === 'layers' && <LayersPanel state={state} dispatch={dispatch} onOpenLayerMenu={onOpenLayerMenu}/>} 
      {state.panel === 'props' && <PropsPanel state={state} dispatch={dispatch}/>} 
      {state.panel === 'canvas' && <CanvasPanel state={state} dispatch={dispatch}/>} 
      {state.panel === 'code' && <CodePanel state={state}/>} 
    </div>
  </aside>;
}

function ShapesPanel({ dispatch }: { dispatch: React.Dispatch<EditorAction> }) {
  const basic = shapes.filter(s=>s.group==='basic');
  const ui3d = shapes.filter(s=>s.group==='ui3d');
  const addShape = (shapeId: string) => {
    dispatch({ type: 'SET_LAST_ASSET', lastShapeId: shapeId });
    dispatch({ type:'ADD_ELEMENTS', elements:[makeShape(shapeId)] });
  };
  return <div className="panel-stack"><h3>기본 도형</h3><div className="asset-grid">{basic.map(s=><button key={s.id} onClick={()=>addShape(s.id)}><b>{s.mark}</b><small>{s.name}</small></button>)}</div><h3>입체 / UI 도형</h3><div className="asset-grid">{ui3d.map(s=><button key={s.id} onClick={()=>addShape(s.id)}><b>{s.mark}</b><small>{s.name}</small></button>)}</div></div>;
}

function svgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
function backgroundImageFromSvg(svg: string, state: EditorState, name: string) {
  const img = makeImage(svgDataUrl(svg), name);
  img.x = 0; img.y = 0; img.w = state.canvasW; img.h = state.canvasH;
  img.objectFit = 'fill';
  img.locked = true;
  img.strokeWidth = 0;
  return img;
}
function insertBackground(state: EditorState, dispatch: React.Dispatch<EditorAction>, el: UIElement, status: string) {
  const next = [el, ...state.elements.filter(item => !item.name.startsWith('Background ·'))];
  dispatch({ type: 'REPLACE_ELEMENTS', elements: next, selectedIds: [el.id], status });
  dispatch({ type: 'LAYER_ORDER', ids: [el.id], direction: 'back' });
}
function BackgroundPanel({ state, dispatch }: { state: EditorState; dispatch: React.Dispatch<EditorAction> }) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [mode, setMode] = useState<'solid' | 'gradient' | 'pattern' | 'image'>('solid');
  const [colorA, setColorA] = useState(state.tokens.background);
  const [colorB, setColorB] = useState(state.tokens.primary);
  const [colorC, setColorC] = useState(state.tokens.secondary);
  const [patternType, setPatternType] = useState<'grid' | 'dots' | 'diagonal' | 'soft'>('grid');
  const [imageSrc, setImageSrc] = useState('');
  const [imageName, setImageName] = useState('Background Image');
  const [objectFit, setObjectFit] = useState<'cover' | 'contain' | 'fill'>('cover');

  const makePatternSvg = () => {
    const w = state.canvasW, h = state.canvasH;
    if (patternType === 'dots') {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="${colorA}"/><defs><pattern id="p" width="34" height="34" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="2" fill="${colorB}" opacity=".34"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/></svg>`;
    }
    if (patternType === 'diagonal') {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="${colorA}"/><defs><pattern id="p" width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="28" stroke="${colorB}" stroke-width="3" opacity=".18"/></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/><radialGradient id="r" cx="50%" cy="20%" r="90%"><stop offset="0" stop-color="${colorC}" stop-opacity=".16"/><stop offset="1" stop-color="${colorC}" stop-opacity="0"/></radialGradient><rect width="100%" height="100%" fill="url(#r)"/></svg>`;
    }
    if (patternType === 'soft') {
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${colorA}"/><stop offset=".52" stop-color="${colorB}"/><stop offset="1" stop-color="${colorC}"/></linearGradient><filter id="blur"><feGaussianBlur stdDeviation="32"/></filter></defs><rect width="100%" height="100%" fill="url(#g)"/><g filter="url(#blur)" opacity=".38"><circle cx="${w*.22}" cy="${h*.25}" r="${Math.min(w,h)*.16}" fill="#fff"/><circle cx="${w*.82}" cy="${h*.72}" r="${Math.min(w,h)*.22}" fill="${colorC}"/></g></svg>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="${colorA}"/><g stroke="${colorB}" stroke-opacity=".18" stroke-width="1">${Array.from({length:Math.ceil(h/32)+1}).map((_,i)=>`<path d="M0 ${i*32}H${w}"/>`).join('')}${Array.from({length:Math.ceil(w/32)+1}).map((_,i)=>`<path d="M${i*32} 0V${h}"/>`).join('')}</g><g stroke="${colorC}" stroke-opacity=".16" stroke-width="1.5">${Array.from({length:Math.ceil(h/160)+1}).map((_,i)=>`<path d="M0 ${i*160}H${w}"/>`).join('')}${Array.from({length:Math.ceil(w/160)+1}).map((_,i)=>`<path d="M${i*160} 0V${h}"/>`).join('')}</g></svg>`;
  };

  const apply = () => {
    if (mode === 'solid') {
      const bg = makeShape('rect');
      bg.name = 'Background · Solid';
      bg.x = 0; bg.y = 0; bg.w = state.canvasW; bg.h = state.canvasH;
      bg.fill = colorA;
      bg.strokeWidth = 0;
      bg.radius = 0;
      bg.locked = true;
      insertBackground(state, dispatch, bg, '단색 배경 적용');
      return;
    }
    if (mode === 'gradient') {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${state.canvasW}" height="${state.canvasH}" viewBox="0 0 ${state.canvasW} ${state.canvasH}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${colorA}"/><stop offset=".48" stop-color="${colorB}"/><stop offset="1" stop-color="${colorC}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`;
      insertBackground(state, dispatch, backgroundImageFromSvg(svg, state, 'Background · Gradient'), '그라데이션 배경 적용');
      return;
    }
    if (mode === 'pattern') {
      insertBackground(state, dispatch, backgroundImageFromSvg(makePatternSvg(), state, `Background · Pattern ${patternType}`), '패턴 배경 적용');
      return;
    }
    if (mode === 'image') {
      if (!imageSrc) {
        dispatch({ type:'SET_STATUS', status:'배경 이미지 파일을 먼저 선택하세요' });
        return;
      }
      const img = makeImage(imageSrc, `Background · ${imageName || 'Image'}`);
      img.x = 0; img.y = 0; img.w = state.canvasW; img.h = state.canvasH; img.objectFit = objectFit; img.locked = true; img.strokeWidth = 0;
      insertBackground(state, dispatch, img, '이미지 배경 적용');
    }
  };

  const openImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const src = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
    setImageSrc(src);
    setImageName(file.name.replace(/\.[^.]+$/, ''));
    setMode('image');
    event.target.value = '';
  };

  return <div className="panel-stack background-panel">
    <h3>배경 설정</h3>
    <p className="panel-help">배경 유형을 선택하고 색상·패턴·이미지를 설정한 뒤 현재 캔버스 해상도에 맞춰 맨 뒤 잠금 레이어로 적용합니다.</p>
    <Field label="배경 유형"><select value={mode} onChange={e=>setMode(e.target.value as typeof mode)}><option value="solid">단색</option><option value="gradient">그라데이션</option><option value="pattern">패턴</option><option value="image">이미지</option></select></Field>
    <div className="background-mode-tabs"><button className={mode==='solid'?'active':''} onClick={()=>setMode('solid')}>단색</button><button className={mode==='gradient'?'active':''} onClick={()=>setMode('gradient')}>그라데이션</button><button className={mode==='pattern'?'active':''} onClick={()=>setMode('pattern')}>패턴</button><button className={mode==='image'?'active':''} onClick={()=>setMode('image')}>이미지</button></div>
    <div className="three"><Field label="색상 A"><input type="color" value={colorA} onChange={e=>setColorA(e.target.value)} /></Field><Field label="색상 B"><input type="color" value={colorB} onChange={e=>setColorB(e.target.value)} /></Field><Field label="색상 C"><input type="color" value={colorC} onChange={e=>setColorC(e.target.value)} /></Field></div>
    {mode === 'pattern' && <Field label="패턴 종류"><select value={patternType} onChange={e=>setPatternType(e.target.value as typeof patternType)}><option value="grid">그리드</option><option value="dots">도트</option><option value="diagonal">대각선</option><option value="soft">소프트 블롭</option></select></Field>}
    {mode === 'image' && <><button onClick={() => fileRef.current?.click()}>이미지 파일 선택</button><input ref={fileRef} className="hidden-input" type="file" accept="image/*" onChange={openImage}/>{imageSrc && <div className="background-preview"><img src={imageSrc} alt="background preview"/></div>}<Field label="맞춤"><select value={objectFit} onChange={e=>setObjectFit(e.target.value as typeof objectFit)}><option value="cover">cover</option><option value="contain">contain</option><option value="fill">fill</option></select></Field></>}
    <button className="primary-wide" onClick={apply}>현재 캔버스 배경 적용</button>
  </div>;
}
function IconsPanel({ dispatch }: { dispatch: React.Dispatch<EditorAction> }) {
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const colorIcons = useMemo(()=> colorSvgIconDefs.filter(i => !query || i.name.toLowerCase().includes(query) || i.category.toLowerCase().includes(query)).slice(0,80), [query]);
  const svgIcons = useMemo(()=> svgIconDefs.filter(i => !query || i.name.toLowerCase().includes(query) || i.category.toLowerCase().includes(query)).slice(0,180), [query]);
  const textIcons = useMemo(()=> iconDefs.filter(i => !query || i.name.toLowerCase().includes(query) || i.symbol.includes(q) || i.category.toLowerCase().includes(query)).slice(0,300), [query, q]);
  return <div className="panel-stack icons-panel">
    <h3>SVG 아이콘 라이브러리</h3>
    <p className="panel-help">외부 CDN 없이 바로 쓰는 내장 SVG 아이콘 세트입니다. UI 버튼, 앱 메뉴, 대시보드, 모바일 화면에 더 깔끔하게 들어갑니다.</p>
    <input value={q} onChange={e=>setQ(e.target.value)} placeholder="검색: home, user, chart, brush, 보안..."/>
    <h3>컬러 앱 아이콘</h3>
    <p className="panel-help">첨부해주신 앱 아이콘 계열을 참고해 만든 내장 컬러 SVG 아이콘입니다. 외부 이미지가 아니라 벡터 레이어로 삽입됩니다.</p>
    <div className="svg-icon-grid color-icon-grid">
      {colorIcons.map(ic=><button key={ic.id} title={`${ic.name} · ${ic.category}`} onClick={()=>{dispatch({type:'SET_LAST_ASSET', lastIconSymbol:'◈', lastIconName:ic.name}); dispatch({type:'ADD_ELEMENTS', elements:[makeColorSvgIcon(ic.paths, ic.name, ic.viewBox)]});}}>
        <svg viewBox={ic.viewBox} aria-hidden="true">{ic.paths.map((path, idx)=><path key={idx} d={path.d} fill={path.fill ?? 'none'} stroke={path.stroke} strokeWidth={path.strokeWidth} opacity={path.opacity} strokeLinecap={path.lineCap} strokeLinejoin={path.lineJoin}/>)}</svg>
        <small>{ic.name}</small>
      </button>)}
    </div>
    <h3>라인 SVG 아이콘</h3>
    <div className="svg-icon-grid">
      {svgIcons.map(ic=><button key={ic.id} title={`${ic.name} · ${ic.category}`} onClick={()=>{dispatch({type:'SET_LAST_ASSET', lastIconSymbol:'◈', lastIconName:ic.name}); dispatch({type:'ADD_ELEMENTS', elements:[makeSvgIcon(ic.paths, ic.name, ic.viewBox)]});}}>
        <svg viewBox={ic.viewBox} aria-hidden="true">{ic.paths.map((d, idx)=><path key={idx} d={d}/>)}</svg>
        <small>{ic.name}</small>
      </button>)}
    </div>
    <h3>텍스트 / 이모지 아이콘</h3>
    <div className="icon-grid">{textIcons.map(ic=><button key={ic.id} title={`${ic.name} · ${ic.category}`} onClick={()=>{dispatch({type:'SET_LAST_ASSET', lastIconSymbol:ic.symbol, lastIconName:ic.name}); dispatch({type:'ADD_ELEMENTS', elements:[makeIcon(ic.symbol, ic.name)]});}}>{ic.symbol}</button>)}</div>
  </div>;
}

function IconStudioPanel({ state, dispatch }: { state: EditorState; dispatch: React.Dispatch<EditorAction> }) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [symbol, setSymbol] = useState('✦');
  const [label, setLabel] = useState('Custom Icon');
  const [color, setColor] = useState('#FFFFFF');
  const [background, setBackground] = useState('#2563EB');
  const [size, setSize] = useState(256);
  const [radius, setRadius] = useState(56);
  const [withBg, setWithBg] = useState(true);
  const [imageSrc, setImageSrc] = useState('');
  const [imageScale, setImageScale] = useState(86);
  const [extractEnabled, setExtractEnabled] = useState(false);
  const [extractMode, setExtractMode] = useState<'corner' | 'white' | 'black'>('corner');
  const [extractTolerance, setExtractTolerance] = useState(42);
  const [extractFeather, setExtractFeather] = useState(2);
  const [autoFitSubject, setAutoFitSubject] = useState(true);
  const [volume, setVolume] = useState(true);
  const [emboss, setEmboss] = useState(true);
  const [shadow, setShadow] = useState(true);
  const [lastPng, setLastPng] = useState('');

  const rounded = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    const rr = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  };

  const readImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

  const dataUrlToBlob = async (dataUrl: string) => {
    const res = await fetch(dataUrl);
    return await res.blob();
  };

  const distance = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) => {
    const dr = r1 - r2;
    const dg = g1 - g2;
    const db = b1 - b2;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  };

  const sampleCornerColor = (data: Uint8ClampedArray, w: number, h: number) => {
    if (extractMode === 'white') return { r: 255, g: 255, b: 255 };
    if (extractMode === 'black') return { r: 0, g: 0, b: 0 };
    const sample = Math.max(2, Math.min(10, Math.floor(Math.min(w, h) * 0.035)));
    let r = 0, g = 0, b = 0, count = 0;
    const zones = [
      [0, 0],
      [Math.max(0, w - sample), 0],
      [0, Math.max(0, h - sample)],
      [Math.max(0, w - sample), Math.max(0, h - sample)],
    ];
    for (const [sx, sy] of zones) {
      for (let yy = 0; yy < sample; yy++) {
        for (let xx = 0; xx < sample; xx++) {
          const x = Math.min(w - 1, sx + xx);
          const y = Math.min(h - 1, sy + yy);
          const i = (y * w + x) * 4;
          if (data[i + 3] < 10) continue;
          r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
        }
      }
    }
    return count ? { r: r / count, g: g / count, b: b / count } : { r: 255, g: 255, b: 255 };
  };

  const applyEdgeBackgroundExtraction = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return canvas;
    const w = canvas.width;
    const h = canvas.height;
    if (w < 2 || h < 2) return canvas;
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const bg = sampleCornerColor(data, w, h);
    const threshold = Math.max(2, extractTolerance);
    const mask = new Uint8Array(w * h);
    const queue = new Int32Array(w * h);
    let head = 0, tail = 0;

    const isBg = (p: number) => {
      const i = p * 4;
      if (data[i + 3] <= 8) return true;
      return distance(data[i], data[i + 1], data[i + 2], bg.r, bg.g, bg.b) <= threshold;
    };
    const add = (p: number) => {
      if (p < 0 || p >= mask.length || mask[p]) return;
      if (!isBg(p)) return;
      mask[p] = 1;
      queue[tail++] = p;
    };

    for (let x = 0; x < w; x++) { add(x); add((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { add(y * w); add(y * w + w - 1); }

    while (head < tail) {
      const p = queue[head++];
      const x = p % w;
      const y = Math.floor(p / w);
      if (x > 0) add(p - 1);
      if (x < w - 1) add(p + 1);
      if (y > 0) add(p - w);
      if (y < h - 1) add(p + w);
    }

    const feather = Math.max(0, Math.min(8, extractFeather));
    if (feather > 0) {
      const alpha = new Float32Array(w * h);
      alpha.fill(1);
      for (let p = 0; p < mask.length; p++) if (mask[p]) alpha[p] = 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const p = y * w + x;
          if (mask[p]) continue;
          let minD = Infinity;
          for (let dy = -feather; dy <= feather; dy++) {
            const yy = y + dy;
            if (yy < 0 || yy >= h) continue;
            for (let dx = -feather; dx <= feather; dx++) {
              const xx = x + dx;
              if (xx < 0 || xx >= w) continue;
              const q = yy * w + xx;
              if (!mask[q]) continue;
              const d = Math.sqrt(dx * dx + dy * dy);
              if (d < minD) minD = d;
            }
          }
          if (minD <= feather) alpha[p] = Math.max(0.18, Math.min(1, minD / (feather + 0.001)));
        }
      }
      for (let p = 0; p < mask.length; p++) {
        const i = p * 4;
        data[i + 3] = Math.round(data[i + 3] * alpha[p]);
      }
    } else {
      for (let p = 0; p < mask.length; p++) if (mask[p]) data[p * 4 + 3] = 0;
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  };

  const trimTransparentCanvas = (source: HTMLCanvasElement, padding = 8) => {
    const ctx = source.getContext('2d', { willReadFrequently: true });
    if (!ctx) return source;
    const w = source.width, h = source.height;
    const data = ctx.getImageData(0, 0, w, h).data;
    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] <= 12) continue;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
    if (maxX < minX || maxY < minY) return source;
    minX = Math.max(0, minX - padding); minY = Math.max(0, minY - padding);
    maxX = Math.min(w - 1, maxX + padding); maxY = Math.min(h - 1, maxY + padding);
    const out = document.createElement('canvas');
    out.width = Math.max(1, maxX - minX + 1);
    out.height = Math.max(1, maxY - minY + 1);
    out.getContext('2d')?.drawImage(source, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
    return out;
  };

  const prepareSourceImage = async (src: string) => {
    const img = await readImage(src);
    const maxSide = 1100;
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    if (extractEnabled) {
      applyEdgeBackgroundExtraction(canvas);
      if (autoFitSubject) return trimTransparentCanvas(canvas, Math.max(6, Math.round(Math.min(canvas.width, canvas.height) * 0.025)));
    }
    return canvas;
  };

  const buildPng = async () => {
    const dpr = 2;
    const canvas = document.createElement('canvas');
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas context failed');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const pad = Math.max(10, Math.round(size * 0.075));
    const box = { x: pad, y: pad, w: size - pad * 2, h: size - pad * 2 };
    const rr = Math.min(radius, box.w / 2, box.h / 2);

    if (shadow) {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.38)';
      ctx.shadowBlur = Math.round(size * 0.09);
      ctx.shadowOffsetY = Math.round(size * 0.035);
      rounded(ctx, box.x, box.y, box.w, box.h, rr);
      ctx.fillStyle = withBg ? background : 'rgba(255,255,255,.01)';
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    rounded(ctx, box.x, box.y, box.w, box.h, rr);
    ctx.clip();

    if (withBg) {
      const grad = ctx.createLinearGradient(0, box.y, 0, box.y + box.h);
      grad.addColorStop(0, volume ? '#ffffff' : background);
      grad.addColorStop(volume ? 0.13 : 0, volume ? 'rgba(255,255,255,.45)' : background);
      grad.addColorStop(0.42, background);
      grad.addColorStop(1, volume ? 'rgba(0,0,0,.22)' : background);
      ctx.fillStyle = volume ? grad : background;
      ctx.fillRect(box.x, box.y, box.w, box.h);
    }

    if (imageSrc) {
      const prepared = await prepareSourceImage(imageSrc);
      const scale = imageScale / 100;
      const maxW = box.w * scale;
      const maxH = box.h * scale;
      const aspect = prepared.width / Math.max(1, prepared.height);
      let dw = maxW;
      let dh = dw / aspect;
      if (dh > maxH) { dh = maxH; dw = dh * aspect; }
      ctx.drawImage(prepared, box.x + (box.w - dw) / 2, box.y + (box.h - dh) / 2, dw, dh);
    } else {
      ctx.font = `700 ${Math.round(size * 0.42)}px "Segoe UI Emoji", "Segoe UI Symbol", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      if (emboss) {
        ctx.shadowColor = 'rgba(255,255,255,.45)';
        ctx.shadowBlur = 1;
        ctx.shadowOffsetX = -1;
        ctx.shadowOffsetY = -1;
        ctx.fillText(symbol || '✦', size / 2, size / 2 + size * 0.02);
        ctx.shadowColor = 'rgba(0,0,0,.35)';
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
      }
      ctx.fillText(symbol || '✦', size / 2, size / 2 + size * 0.02);
    }

    if (emboss) {
      const hi = ctx.createLinearGradient(0, box.y, 0, box.y + box.h);
      hi.addColorStop(0, 'rgba(255,255,255,.42)');
      hi.addColorStop(.38, 'rgba(255,255,255,.04)');
      hi.addColorStop(1, 'rgba(0,0,0,.18)');
      ctx.fillStyle = hi;
      ctx.fillRect(box.x, box.y, box.w, box.h);
      ctx.strokeStyle = 'rgba(255,255,255,.28)';
      ctx.lineWidth = 1;
      rounded(ctx, box.x + .5, box.y + .5, box.w - 1, box.h - 1, Math.max(0, rr - .5));
      ctx.stroke();
    }
    ctx.restore();

    // outside the rounded border is never painted, so the exported PNG keeps transparent corners.
    return canvas.toDataURL('image/png');
  };

  const ensurePng = async () => {
    const png = await buildPng();
    setLastPng(png);
    return png;
  };

  const addToCanvas = async () => {
    const png = await ensurePng();
    const icon = makeImage(png, label || 'Custom Icon');
    icon.w = size;
    icon.h = size;
    icon.radius = radius;
    icon.strokeWidth = 0;
    icon.objectFit = 'fill';
    dispatch({ type:'ADD_ELEMENTS', elements:[icon] });
  };

  const saveToLibrary = async () => {
    const png = await ensurePng();
    const icon: CustomIcon = { id: uid('custom-icon'), name: label || 'Custom Icon', src: png, size, radius, createdAt: new Date().toISOString() };
    dispatch({ type:'ADD_CUSTOM_ICON', icon });
  };

  const savePngToPc = async () => {
    const png = await ensurePng();
    const blob = await dataUrlToBlob(png);
    const safeName = (label || 'custom-icon').replace(/[^a-zA-Z0-9가-힣_-]+/g, '_');
    const mode = await saveBlob(blob, `${safeName}.png`, 'image/png');
    dispatch({ type:'SET_STATUS', status:`아이콘 PNG 저장: ${mode}` });
  };

  const saveSvgToPc = async () => {
    const png = await ensurePng();
    const safeName = (label || 'custom-icon').replace(/[^a-zA-Z0-9가-힣_-]+/g, '_');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><image href="${png}" x="0" y="0" width="${size}" height="${size}"/></svg>`;
    const mode = await saveBlob(new Blob([svg], { type:'image/svg+xml;charset=utf-8' }), `${safeName}.svg`, 'image/svg+xml');
    dispatch({ type:'SET_STATUS', status:`아이콘 SVG 저장: ${mode}` });
  };

  const openImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const src = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
    setImageSrc(src);
    setExtractEnabled(true);
    setExtractMode('corner');
    setLastPng('');
    setLabel(file.name.replace(/\.[^.]+$/, '') || 'Image Icon');
    event.target.value = '';
  };

  const insertStored = (icon: CustomIcon) => {
    const el = makeImage(icon.src, icon.name);
    el.w = icon.size;
    el.h = icon.size;
    el.radius = icon.radius;
    el.strokeWidth = 0;
    el.objectFit = 'fill';
    dispatch({ type:'ADD_ELEMENTS', elements:[el] });
  };

  return <div className="panel-stack icon-studio-panel">
    <h3>아이콘 제작</h3>
    <p className="panel-help">이미지 또는 심볼을 불러와 앱 아이콘으로 제작합니다. 이미지의 외곽 배경을 자동 투명 처리해 주요 개체를 따낼 수 있고, 둥글기·볼륨감·엠보싱·그림자를 적용해 PNG/SVG로 저장하거나 보관함에 저장할 수 있습니다.</p>
    <div className="icon-studio-preview image-icon-preview" style={{ width: 156, height: 156, borderRadius: Math.min(34, radius / Math.max(1, size) * 156), color, background: withBg ? background : 'transparent' }}>
      {lastPng ? <img src={lastPng} alt="icon preview"/> : imageSrc ? <img src={imageSrc} alt="icon source"/> : <span>{symbol || '✦'}</span>}
    </div>
    <div className="button-grid"><button onClick={() => fileRef.current?.click()}>이미지 불러오기</button><button onClick={() => { setImageSrc(''); setLastPng(''); }}>이미지 제거</button><button onClick={ensurePng}>추출 미리보기</button><button onClick={() => { setExtractEnabled(true); setExtractMode('corner'); setLastPng(''); }}>외곽 투명 자동</button></div>
    <input ref={fileRef} className="hidden-input" type="file" accept="image/*" onChange={openImage}/>
    {imageSrc && <div className="extract-panel">
      <h4>주요 개체 추출</h4>
      <p className="panel-help">모서리에서 연결된 배경만 제거합니다. 내부 흰색 글자나 밝은 영역은 최대한 보존합니다.</p>
      <div className="two"><Field label="외곽 배경 투명"><input type="checkbox" checked={extractEnabled} onChange={e=>{setExtractEnabled(e.target.checked); setLastPng('');}} /></Field><Field label="자동 여백 맞춤"><input type="checkbox" checked={autoFitSubject} onChange={e=>{setAutoFitSubject(e.target.checked); setLastPng('');}} /></Field></div>
      <Field label="배경 기준"><select value={extractMode} onChange={e=>{setExtractMode(e.target.value as 'corner' | 'white' | 'black'); setLastPng('');}}><option value="corner">모서리 자동</option><option value="white">흰 배경</option><option value="black">검은 배경</option></select></Field>
      <div className="two"><Field label={`허용 범위 ${extractTolerance}`}><input type="range" min="8" max="150" value={extractTolerance} onChange={e=>{setExtractTolerance(Number(e.target.value)); setLastPng('');}} /></Field><Field label={`가장자리 부드럽게 ${extractFeather}px`}><input type="range" min="0" max="8" value={extractFeather} onChange={e=>{setExtractFeather(Number(e.target.value)); setLastPng('');}} /></Field></div>
    </div>}
    <Field label="아이콘 심볼"><input value={symbol} onChange={e=>{setSymbol(e.target.value.slice(0, 8)); setLastPng('');}} placeholder="예: ✦, 🔍, ⚙" /></Field>
    <Field label="이름"><input value={label} onChange={e=>setLabel(e.target.value)} /></Field>
    <div className="two"><Field label="아이콘 색"><input type="color" value={color} onChange={e=>{setColor(e.target.value); setLastPng('');}} /></Field><Field label="배경색"><input type="color" value={background} onChange={e=>{setBackground(e.target.value); setLastPng('');}} /></Field></div>
    <div className="two"><Field label={`크기 ${size}px`}><input type="range" min="64" max="512" value={size} onChange={e=>{setSize(Number(e.target.value)); setLastPng('');}} /></Field><Field label={`둥글기 ${radius}px`}><input type="range" min="0" max={Math.round(size/2)} value={radius} onChange={e=>{setRadius(Number(e.target.value)); setLastPng('');}} /></Field></div>
    {imageSrc && <Field label={`이미지 크기 ${imageScale}%`}><input type="range" min="45" max="145" value={imageScale} onChange={e=>{setImageScale(Number(e.target.value)); setLastPng('');}} /></Field>}
    <div className="two"><Field label="배경 사용"><input type="checkbox" checked={withBg} onChange={e=>{setWithBg(e.target.checked); setLastPng('');}} /></Field><Field label="볼륨감"><input type="checkbox" checked={volume} onChange={e=>{setVolume(e.target.checked); setLastPng('');}} /></Field><Field label="엠보싱"><input type="checkbox" checked={emboss} onChange={e=>{setEmboss(e.target.checked); setLastPng('');}} /></Field><Field label="그림자"><input type="checkbox" checked={shadow} onChange={e=>{setShadow(e.target.checked); setLastPng('');}} /></Field></div>
    <div className="button-grid"><button onClick={addToCanvas}>캔버스에 추가</button><button onClick={saveToLibrary}>제작 메뉴에 저장</button><button onClick={savePngToPc}>PNG 저장</button><button onClick={saveSvgToPc}>SVG 저장</button></div>
    <h3>제작한 아이콘</h3>
    <div className="custom-icon-list">
      {state.customIcons.length === 0 && <p className="panel-help">아직 저장한 아이콘이 없습니다.</p>}
      {state.customIcons.map(icon => <div key={icon.id} className="custom-icon-card"><button onClick={()=>insertStored(icon)}><img src={icon.src} alt={icon.name}/></button><b>{icon.name}</b><small>{icon.size}px · r{icon.radius}</small><button onClick={()=>dispatch({type:'DELETE_CUSTOM_ICON', id:icon.id})}>삭제</button></div>)}
    </div>
  </div>;
}
function SamplesPanel({ state, dispatch }: { state: EditorState; dispatch: React.Dispatch<EditorAction> }) {
  const samples = useMemo(()=>createSampleUis(), []);
  const [q, setQ] = useState('');
  const list = samples.filter(s => !q || s.name.includes(q) || s.category.includes(q) || s.desc.includes(q));
  const insert = (sampleId: string) => {
    const sample = samples.find(s=>s.id===sampleId); if(!sample) return;
    const elements = sample.elements.map((el, index)=>({...cloneElement(el,state.canvasW,state.canvasH,0), id:uid(el.kind), groupId: undefined, x: el.x + 120, y: el.y + 100 + index * 0 }));
    dispatch({type:'ADD_ELEMENTS', elements});
  };
  return <div className="panel-stack"><h3>샘플 UI 20개</h3><input value={q} onChange={e=>setQ(e.target.value)} placeholder="검색: 로그인, 카드, 모바일..." />{list.map(s=><button key={s.id} className="sample-card" onClick={()=>insert(s.id)}><b>{s.name}</b><small>{s.category} · {s.desc}</small></button>)}</div>;
}


function WebSamplesPanel({ state, dispatch }: { state: EditorState; dispatch: React.Dispatch<EditorAction> }) {
  const webSamples = useMemo(() => createWebSamples(), []);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('all');
  const categories = useMemo(() => ['all', ...Array.from(new Set(webSamples.map(s => s.category)))], [webSamples]);
  const list = webSamples.filter(s => {
    const matchCategory = category === 'all' || s.category === category;
    const query = q.trim().toLowerCase();
    const matchQuery = !query || s.name.toLowerCase().includes(query) || s.category.toLowerCase().includes(query) || s.desc.toLowerCase().includes(query);
    return matchCategory && matchQuery;
  });
  const insert = (sampleId: string) => {
    const sample = webSamples.find(s => s.id === sampleId);
    if (!sample) return;
    const elements = sample.elements.map((el) => ({
      ...cloneElement(el, state.canvasW, state.canvasH, 0),
      id: uid(el.kind),
      groupId: undefined,
      x: el.x + 80,
      y: el.y + 60,
    }));
    dispatch({ type: 'ADD_ELEMENTS', elements });
    dispatch({ type: 'SET_STATUS', status: `${sample.name} 웹 샘플 레이어 추가` });
  };
  return <div className="panel-stack">
    <h3>웹사이트 샘플 레이어 30개</h3>
    <p className="panel-help">아이콘, 제목, 설명, 버튼, 카드가 함께 들어간 웹사이트 참고용 레이어입니다. 삽입 후 각 레이어를 개별 편집하거나 직접 그룹화해서 사용하세요.</p>
    <input value={q} onChange={e => setQ(e.target.value)} placeholder="검색: landing, dashboard, pricing, form..." />
    <div className="button-grid">
      {categories.map(c => <button key={c} className={category === c ? 'active' : ''} onClick={() => setCategory(c)}>{c === 'all' ? '전체' : c}</button>)}
    </div>
    {list.map(s => <button key={s.id} className="sample-card web-sample-card" onClick={() => insert(s.id)}>
      <b>{s.name}</b>
      <small>{s.category} · {s.desc}</small>
    </button>)}
  </div>;
}


function ComponentsPanel({ state, dispatch }: { state: EditorState; dispatch: React.Dispatch<EditorAction> }) {
  const saveSelection = () => {
    const items = state.elements.filter(el => state.selectedIds.includes(el.id));
    if (!items.length) return dispatch({type:'SET_STATUS', status:'저장할 선택 요소가 없습니다'});
    const b = getBounds(items); if (!b) return;
    const normalized = items.map(el => ({...cloneElement(el, state.canvasW, state.canvasH, 0), x: el.x - b.x, y: el.y - b.y, id: uid(el.kind)}));
    const svg = buildSvg(normalized, Math.max(1,b.w), Math.max(1,b.h), state.tokens, false, false);
    const comp = { id: uid('component'), name: `Component ${state.customComponents.length + 1}`, elements: normalized, thumbnail: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, createdAt: new Date().toISOString() };
    dispatch({type:'ADD_CUSTOM_COMPONENT', component: comp});
  };
  const insert = (c: CustomComponent) => dispatch({type:'ADD_ELEMENTS', elements: cloneComponentElements(c,state.canvasW,state.canvasH)});
  return <div className="panel-stack"><button onClick={saveSelection}>선택을 사용자 컴포넌트로 저장</button><h3>기본 컴포넌트</h3>{builtInComponents.map(c=><ComponentCard key={c.id} c={c} onInsert={()=>insert(c)}/>) }<h3>사용자 컴포넌트</h3>{state.customComponents.map(c=><ComponentCard key={c.id} c={c} onInsert={()=>insert(c)} onDelete={()=>dispatch({type:'DELETE_CUSTOM_COMPONENT', id:c.id})}/>)}</div>;
}
function ComponentCard({ c, onInsert, onDelete }: { c: CustomComponent; onInsert:()=>void; onDelete?:()=>void }) { return <div className="component-card"><button onClick={onInsert}>{c.thumbnail ? <img src={c.thumbnail}/> : <span>{c.name}</span>}</button><div><b>{c.name}</b>{onDelete&&<button onClick={onDelete}>삭제</button>}</div></div>; }

function StylesPanel({ state, dispatch }: { state: EditorState; dispatch: React.Dispatch<EditorAction> }) { return <div className="panel-stack"><h3>스타일 프리셋</h3>{stylePresets.map(s=><button key={s.id} onClick={()=>dispatch({type:'UPDATE_ELEMENTS', ids:state.selectedIds, patch:s.patch, status:`${s.name} 스타일 적용`})}>{s.name}</button>)}</div>; }
function TokensPanel({ state, dispatch }: { state: EditorState; dispatch: React.Dispatch<EditorAction> }) {
  const set = (patch: Partial<typeof state.tokens>) => dispatch({ type: 'SET_TOKENS', tokens: { ...state.tokens, ...patch } });
  return <div className="panel-stack">
    <h3>디자인 토큰</h3>
    <p className="panel-help">디자인 토큰은 프로젝트 전체에서 반복해서 쓰는 색상, 둥글기, 간격 값입니다. 버튼·카드·배경 스타일을 일관되게 맞추고, CSS 변수 파일로 내보낼 수 있습니다.</p>
    {(['primary','secondary','surface','background','text','muted'] as const).map((key) => <Field key={key} label={key}><input type="color" value={state.tokens[key]} onChange={(event) => set({ [key]: event.target.value })}/></Field>)}
    <Field label="radius"><input type="number" value={state.tokens.radius} onChange={(event) => set({ radius: Number(event.target.value) })}/></Field>
    <Field label="spacing"><input type="number" value={state.tokens.spacing} onChange={(event) => set({ spacing: Number(event.target.value) })}/></Field>
    <button onClick={() => saveText('tokens.css', tokensToCss(state.tokens), 'text/css;charset=utf-8')}>토큰 CSS 저장</button>
    <button onClick={() => dispatch({ type: 'SET_TOKENS', tokens: defaultTokens })}>기본값</button>
  </div>;
}

function LayoutPanel({ state, dispatch }: { state: EditorState; dispatch: React.Dispatch<EditorAction> }) {
  const items = state.elements.filter(el => state.selectedIds.includes(el.id));
  const selectedIds = state.selectedIds;

  const commit = (elements: UIElement[], status: string) => dispatch({ type: 'REPLACE_ELEMENTS', elements, selectedIds, status });

  const align = (type: string) => {
    const b = getBounds(items);
    if (!b) return;
    let next = state.elements.map(el => ({ ...el } as UIElement));
    next = next.map(el => {
      if (!selectedIds.includes(el.id)) return el;
      if (type === 'left') return { ...el, x: b.x } as UIElement;
      if (type === 'cx') return { ...el, x: b.cx - el.w / 2 } as UIElement;
      if (type === 'right') return { ...el, x: b.right - el.w } as UIElement;
      if (type === 'top') return { ...el, y: b.y } as UIElement;
      if (type === 'cy') return { ...el, y: b.cy - el.h / 2 } as UIElement;
      if (type === 'bottom') return { ...el, y: b.bottom - el.h } as UIElement;
      if (type === 'sameW') return { ...el, w: b.w } as UIElement;
      if (type === 'sameH') return { ...el, h: b.h } as UIElement;
      return el;
    });
    commit(next, '정렬/배치');
  };

  const distribute = (axis: 'x' | 'y') => {
    if (items.length < 3) return;
    const ordered = [...items].sort((a, b) => axis === 'x' ? a.x - b.x : a.y - b.y);
    const first = ordered[0];
    const last = ordered[ordered.length - 1];
    const totalSize = ordered.reduce((sum, el) => sum + (axis === 'x' ? el.w : el.h), 0);
    const span = axis === 'x' ? (last.x + last.w - first.x) : (last.y + last.h - first.y);
    const gap = Math.max(0, (span - totalSize) / (ordered.length - 1));
    let cursor = axis === 'x' ? first.x : first.y;
    const pos = new Map<string, number>();
    ordered.forEach((el) => { pos.set(el.id, cursor); cursor += (axis === 'x' ? el.w : el.h) + gap; });
    commit(state.elements.map(el => selectedIds.includes(el.id) ? ({ ...el, [axis]: pos.get(el.id) ?? (axis === 'x' ? el.x : el.y) } as UIElement) : el), axis === 'x' ? '가로 균등 분배' : '세로 균등 분배');
  };

  const autoLayout = (axis: 'x' | 'y', gap = 12, padding = 0) => {
    if (items.length < 2) return;
    const ordered = [...items].sort((a, b) => axis === 'x' ? a.x - b.x : a.y - b.y);
    const b = getBounds(ordered);
    if (!b) return;
    let cursor = axis === 'x' ? b.x + padding : b.y + padding;
    const centered = new Map<string, Partial<UIElement>>();
    ordered.forEach((el) => {
      if (axis === 'x') {
        centered.set(el.id, { x: cursor, y: b.cy - el.h / 2 });
        cursor += el.w + gap;
      } else {
        centered.set(el.id, { x: b.cx - el.w / 2, y: cursor });
        cursor += el.h + gap;
      }
    });
    commit(state.elements.map(el => selectedIds.includes(el.id) ? ({ ...el, ...centered.get(el.id) } as UIElement) : el), axis === 'x' ? 'Auto Layout Lite · 가로' : 'Auto Layout Lite · 세로');
  };

  const booleanPrep = (op: 'union' | 'subtract' | 'intersect' | 'exclude') => {
    if (items.length < 2) {
      dispatch({ type: 'SET_STATUS', status: 'Boolean 준비: 2개 이상 도형을 선택하세요' });
      return;
    }
    dispatch({ type: 'UPDATE_ELEMENTS', ids: selectedIds, patch: { booleanOp: op } as Partial<UIElement>, status: 'Boolean 준비 · ' + op });
  };

  return <div className="panel-stack">
    <h3>정렬 / 분배</h3>
    <div className="hint-box">선택 요소: {items.length}개 · 다중 선택 후 정렬, 분배, Auto Layout Lite를 적용합니다.</div>
    <div className="button-grid"><button onClick={() => align('left')}>좌</button><button onClick={() => align('cx')}>가운데X</button><button onClick={() => align('right')}>우</button><button onClick={() => align('top')}>상</button><button onClick={() => align('cy')}>가운데Y</button><button onClick={() => align('bottom')}>하</button><button onClick={() => align('sameW')}>같은 폭</button><button onClick={() => align('sameH')}>같은 높이</button><button onClick={() => distribute('x')}>가로 분배</button><button onClick={() => distribute('y')}>세로 분배</button></div>
    <h3>Auto Layout Lite</h3>
    <div className="button-grid"><button onClick={() => autoLayout('x', 12, 0)}>가로 12px</button><button onClick={() => autoLayout('x', 24, 0)}>가로 24px</button><button onClick={() => autoLayout('y', 12, 0)}>세로 12px</button><button onClick={() => autoLayout('y', 24, 0)}>세로 24px</button></div>
    <h3>Boolean 준비</h3>
    <div className="hint-box">현재는 실제 path 병합 전 준비 단계입니다. 선택 도형에 연산 메타데이터를 저장해 다음 Boolean 엔진 연결이 가능하게 합니다.</div>
    <div className="button-grid"><button onClick={() => booleanPrep('union')}>Union</button><button onClick={() => booleanPrep('subtract')}>Subtract</button><button onClick={() => booleanPrep('intersect')}>Intersect</button><button onClick={() => booleanPrep('exclude')}>Exclude</button></div>
  </div>;
}
function LayersPanel({ state, dispatch, onOpenLayerMenu }: { state: EditorState; dispatch: React.Dispatch<EditorAction>; onOpenLayerMenu: (event: MouseEvent, id: string) => void }) {
  const groups = new Map<string, UIElement[]>();
  const singles: UIElement[] = [];
  state.elements.forEach((el) => el.groupId ? groups.set(el.groupId, [...(groups.get(el.groupId) || []), el]) : singles.push(el));

  const reorder = (sourceId: string, targetId: string) => {
    if (!sourceId || sourceId === targetId) return;
    const arr = [...state.elements];
    const from = arr.findIndex((v) => v.id === sourceId);
    const to = arr.findIndex((v) => v.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    dispatch({ type: 'REPLACE_ELEMENTS', elements: arr, selectedIds: [sourceId], status: '레이어 재정렬' });
  };

  const row = (el: UIElement, indent = false) => (
    <div
      key={el.id}
      draggable
      onDragStart={(event) => event.dataTransfer.setData('text/plain', el.id)}
      onDrop={(event) => { event.preventDefault(); reorder(event.dataTransfer.getData('text/plain'), el.id); }}
      onDragOver={(event) => event.preventDefault()}
      onClick={() => dispatch({ type: 'SELECT', ids: [el.id] })}
      onContextMenu={(event) => onOpenLayerMenu(event, el.id)}
      className={`layer-row ${state.selectedIds.includes(el.id) ? 'active' : ''} ${indent ? 'indent' : ''} ${!el.visible ? 'is-hidden' : ''}`}
      role="button"
      tabIndex={0}
      title="클릭: 선택 / 우클릭: 레이어 메뉴 / 드래그: 순서 변경"
    >
      <div className="layer-main">
        <span className="layer-name">{el.name}</span>
        <small>{el.kind}{el.groupId ? ' · group' : ''}</small>
      </div>
      <div className="layer-tools" onClick={(event) => event.stopPropagation()}>
        <button type="button" title={el.visible ? '숨기기' : '보이기'} aria-label={el.visible ? '숨기기' : '보이기'} onClick={() => dispatch({ type: 'UPDATE_ELEMENTS', ids: [el.id], patch: { visible: !el.visible }, status: el.visible ? '레이어 숨김' : '레이어 표시' })}>{el.visible ? '👁' : '○'}</button>
        <button type="button" title={el.locked ? '잠금 해제' : '잠금'} aria-label={el.locked ? '잠금 해제' : '잠금'} onClick={() => dispatch({ type: 'UPDATE_ELEMENTS', ids: [el.id], patch: { locked: !el.locked }, status: el.locked ? '레이어 잠금 해제' : '레이어 잠금' })}>{el.locked ? '🔒' : '◇'}</button>
      </div>
    </div>
  );

  return <div className="panel-stack">
    <div className="button-grid">
      <button onClick={() => dispatch({ type: 'LAYER_ORDER', ids: state.selectedIds, direction: 'front' })}>맨앞</button>
      <button onClick={() => dispatch({ type: 'LAYER_ORDER', ids: state.selectedIds, direction: 'forward' })}>1앞</button>
      <button onClick={() => dispatch({ type: 'LAYER_ORDER', ids: state.selectedIds, direction: 'backward' })}>1뒤</button>
      <button onClick={() => dispatch({ type: 'LAYER_ORDER', ids: state.selectedIds, direction: 'back' })}>맨뒤</button>
    </div>
    {Array.from(groups.entries()).map(([gid, items]) => <div key={gid}>
      <button className="group-row" onClick={() => dispatch({ type: 'TOGGLE_GROUP_FOLD', groupId: gid })}>{state.foldedGroups.includes(gid) ? '▸' : '▾'} Group {gid.slice(-4)} <small>{items.length}</small></button>
      {!state.foldedGroups.includes(gid) && items.map((el) => row(el, true))}
    </div>)}
    {singles.slice().reverse().map((el) => row(el))}
  </div>;
}

function PropsPanel({ state, dispatch }: { state: EditorState; dispatch: React.Dispatch<EditorAction> }) {
  const el = state.elements.find(e=>e.id===state.selectedIds[0]);
  const editing = useRef(false);
  if(!el) return <div className="empty">요소를 선택하세요.</div>;
  const begin = () => { if (!editing.current) { editing.current = true; dispatch({type:'BEGIN_TRANSIENT'}); } };
  const commit = () => { if (editing.current) { editing.current = false; dispatch({type:'COMMIT_TRANSIENT', status:'속성 변경'}); } };
  const patch = (p: Partial<UIElement>, immediate = false) => {
    if (!immediate) begin();
    dispatch({type:'UPDATE_ELEMENTS', ids:[el.id], patch:p, commit: immediate ? true : false, status:'속성 변경'});
  };
  return <div className="panel-stack" onPointerUp={commit} onBlur={commit}><h3>{el.name}</h3><Field label="이름"><input value={el.name} onFocus={begin} onChange={e=>patch({name:e.target.value})}/></Field><div className="two"><Field label="X"><input type="number" value={Math.round(el.x)} onFocus={begin} onChange={e=>patch({x:Number(e.target.value)})}/></Field><Field label="Y"><input type="number" value={Math.round(el.y)} onFocus={begin} onChange={e=>patch({y:Number(e.target.value)})}/></Field><Field label="W"><input type="number" value={Math.round(el.w)} onFocus={begin} onChange={e=>patch({w:Number(e.target.value)})}/></Field><Field label="H"><input type="number" value={Math.round(el.h)} onFocus={begin} onChange={e=>patch({h:Number(e.target.value)})}/></Field></div><Field label="투명도"><input type="range" min="0.05" max="1" step="0.01" value={el.opacity} onPointerDown={begin} onChange={e=>patch({opacity:Number(e.target.value)})}/></Field><Field label="회전"><input type="range" min="-180" max="180" value={el.rotate} onPointerDown={begin} onChange={e=>patch({rotate:Number(e.target.value)})}/></Field><EffectsProps el={el} patch={patch}/> {el.kind==='shape'&&<ShapeProps el={el} patch={patch}/>} {el.kind==='text'&&<TextProps el={el} patch={patch}/>} {el.kind==='icon'&&<IconProps el={el} patch={patch}/>} {el.kind==='image'&&<ImageProps el={el} patch={patch}/>}</div>;
}

function EffectsProps({el,patch}:{el:UIElement;patch:(p:Partial<UIElement>, immediate?:boolean)=>void}){
  const shadow = el.shadow ?? { enabled:false, x:0, y:12, blur:24, spread:0, color:'#000000', opacity:0.28 };
  const emboss = el.emboss ?? { enabled:false, depth:3, softness:8, highlightOpacity:0.32, shadowOpacity:0.26 };
  const setShadow = (next: Partial<typeof shadow>, immediate = false) => patch({ shadow: { ...shadow, ...next } } as Partial<UIElement>, immediate);
  const setEmboss = (next: Partial<typeof emboss>, immediate = false) => patch({ emboss: { ...emboss, ...next } } as Partial<UIElement>, immediate);
  return <>
    <h3>효과</h3>
    <Field label="그림자 사용"><input type="checkbox" checked={shadow.enabled} onChange={e=>setShadow({enabled:e.target.checked}, true)}/></Field>
    {shadow.enabled && <div className="two"><Field label="그림자 X"><input type="range" min="-60" max="60" value={shadow.x} onPointerDown={()=>setShadow({}, false)} onChange={e=>setShadow({x:Number(e.target.value)})}/></Field><Field label="그림자 Y"><input type="range" min="-60" max="80" value={shadow.y} onPointerDown={()=>setShadow({}, false)} onChange={e=>setShadow({y:Number(e.target.value)})}/></Field><Field label="블러"><input type="range" min="0" max="90" value={shadow.blur} onPointerDown={()=>setShadow({}, false)} onChange={e=>setShadow({blur:Number(e.target.value)})}/></Field><Field label="확산"><input type="range" min="-20" max="40" value={shadow.spread} onPointerDown={()=>setShadow({}, false)} onChange={e=>setShadow({spread:Number(e.target.value)})}/></Field><Field label="색"><input type="color" value={shadow.color} onChange={e=>setShadow({color:e.target.value}, true)}/></Field><Field label="진함"><input type="range" min="0" max="1" step="0.01" value={shadow.opacity} onPointerDown={()=>setShadow({}, false)} onChange={e=>setShadow({opacity:Number(e.target.value)})}/></Field></div>}
    <Field label="엠보싱 사용"><input type="checkbox" checked={emboss.enabled} onChange={e=>setEmboss({enabled:e.target.checked}, true)}/></Field>
    {emboss.enabled && <div className="two"><Field label="깊이"><input type="range" min="1" max="16" value={emboss.depth} onPointerDown={()=>setEmboss({}, false)} onChange={e=>setEmboss({depth:Number(e.target.value)})}/></Field><Field label="부드러움"><input type="range" min="1" max="30" value={emboss.softness} onPointerDown={()=>setEmboss({}, false)} onChange={e=>setEmboss({softness:Number(e.target.value)})}/></Field><Field label="하이라이트"><input type="range" min="0" max="1" step="0.01" value={emboss.highlightOpacity} onPointerDown={()=>setEmboss({}, false)} onChange={e=>setEmboss({highlightOpacity:Number(e.target.value)})}/></Field><Field label="음영"><input type="range" min="0" max="1" step="0.01" value={emboss.shadowOpacity} onPointerDown={()=>setEmboss({}, false)} onChange={e=>setEmboss({shadowOpacity:Number(e.target.value)})}/></Field></div>}
  </>;
}

function ShapeProps({el,patch}:{el:UIElement;patch:(p:Partial<UIElement>, immediate?:boolean)=>void}){
  if(el.kind!=='shape')return null;
  const hasText = !['line','doubleLine'].includes(el.shapeId);
  return <>
    <Field label="도형"><select value={el.shapeId} onChange={e=>patch({shapeId:e.target.value}, true)}>{shapes.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
    <div className="two"><Field label="채우기 사용"><input type="checkbox" checked={el.fillEnabled} onChange={e=>patch({fillEnabled:e.target.checked}, true)}/></Field><Field label="채우기 색"><input type="color" disabled={!el.fillEnabled} value={el.fill.startsWith('#')?el.fill:'#2563EB'} onChange={e=>patch({fill:e.target.value, fillEnabled:true}, true)}/></Field></div><div className="two"><Field label="선 색"><input type="color" value={el.stroke.startsWith('#')?el.stroke:'#93C5FD'} onChange={e=>patch({stroke:e.target.value}, true)}/></Field><Field label="테두리만"><button type="button" onClick={()=>patch({fillEnabled:false, strokeWidth: Math.max(el.strokeWidth || 0, 2)}, true)}>채우기 끄기 + 선 표시</button></Field></div>
    <div className="two"><Field label="선 두께"><input type="number" min="0" max="60" value={el.strokeWidth} onFocus={()=>patch({}, false)} onChange={e=>patch({strokeWidth:Number(e.target.value)})}/></Field><Field label="둥글기"><input type="range" min="0" max="120" value={el.radius} onPointerDown={()=>patch({}, false)} onChange={e=>patch({radius:Number(e.target.value)})}/></Field></div><div className="two"><Field label="선 스타일"><select value={el.strokeStyle ?? 'solid'} onChange={e=>patch({strokeStyle:e.target.value as any}, true)}><option value="solid">Solid</option><option value="dashed">Dashed</option><option value="dotted">Dotted</option></select></Field><Field label="선 끝"><select value={el.strokeCap ?? 'butt'} onChange={e=>patch({strokeCap:e.target.value as any}, true)}><option value="butt">Butt</option><option value="round">Round</option><option value="square">Square</option></select></Field></div><div className="two"><Field label="선 연결"><select value={el.strokeJoin ?? 'round'} onChange={e=>patch({strokeJoin:e.target.value as any}, true)}><option value="miter">Miter</option><option value="round">Round</option><option value="bevel">Bevel</option></select></Field><Field label="Boolean 준비"><select value={el.booleanOp ?? 'none'} onChange={e=>patch({booleanOp:e.target.value as any}, true)}><option value="none">None</option><option value="union">Union</option><option value="subtract">Subtract</option><option value="intersect">Intersect</option><option value="exclude">Exclude</option></select></Field></div>
    {hasText && <>
      <h3>도형 내부 텍스트</h3>
      <Field label="내용"><textarea value={el.text??''} onFocus={()=>patch({}, false)} onChange={e=>patch({text:e.target.value})} placeholder="도형 안에 들어갈 텍스트"/></Field>
      <Field label="폰트"><select value={el.fontFamily} onChange={e=>patch({fontFamily:e.target.value}, true)}>{fontFamilies.map(f=><option key={f.value} value={f.value}>{f.label}</option>)}</select></Field>
      <div className="two"><Field label="텍스트 색"><input type="color" value={el.textColor??'#fff'} onChange={e=>patch({textColor:e.target.value}, true)}/></Field><Field label="크기"><input type="number" min="6" max="260" value={el.fontSize} onFocus={()=>patch({}, false)} onChange={e=>patch({fontSize:Number(e.target.value)})}/></Field></div>
      <div className="two"><Field label="굵기"><select value={el.fontWeight} onChange={e=>patch({fontWeight:Number(e.target.value)}, true)}>{fontWeights.map(w=><option key={w} value={w}>{w}</option>)}</select></Field><Field label="기울임"><select value={el.fontStyle} onChange={e=>patch({fontStyle:e.target.value as any}, true)}><option value="normal">Normal</option><option value="italic">Italic</option></select></Field></div>
      <div className="button-grid"><button onClick={()=>patch({textAlign:'left'}, true)}>좌</button><button onClick={()=>patch({textAlign:'center'}, true)}>중앙</button><button onClick={()=>patch({textAlign:'right'}, true)}>우</button><button onClick={()=>patch({verticalAlign:'start'}, true)}>상</button><button onClick={()=>patch({verticalAlign:'center'}, true)}>중</button><button onClick={()=>patch({verticalAlign:'end'}, true)}>하</button></div>
    </>}
  </>;
}
function TextProps({el,patch}:{el:UIElement;patch:(p:Partial<UIElement>, immediate?:boolean)=>void}){ if(el.kind!=='text')return null; return <><Field label="텍스트"><textarea value={el.text} onFocus={()=>patch({}, false)} onChange={e=>patch({text:e.target.value})}/></Field><Field label="폰트"><select value={el.fontFamily} onChange={e=>patch({fontFamily:e.target.value}, true)}>{fontFamilies.map(f=><option key={f.value} value={f.value}>{f.label}</option>)}</select></Field><div className="two"><Field label="색"><input type="color" value={el.textColor??'#fff'} onChange={e=>patch({textColor:e.target.value}, true)}/></Field><Field label="크기"><input type="number" value={el.fontSize} onFocus={()=>patch({}, false)} onChange={e=>patch({fontSize:Number(e.target.value)})}/></Field><Field label="굵기"><select value={el.fontWeight} onChange={e=>patch({fontWeight:Number(e.target.value)}, true)}>{fontWeights.map(w=><option key={w} value={w}>{w}</option>)}</select></Field></div></> }
function IconProps({el,patch}:{el:UIElement;patch:(p:Partial<UIElement>, immediate?:boolean)=>void}){ if(el.kind!=='icon')return null; return <><Field label="아이콘"><input value={el.iconSymbol} onFocus={()=>patch({}, false)} onChange={e=>patch({iconSymbol:e.target.value,text:e.target.value})}/></Field><Field label="크기"><input type="number" value={el.fontSize} onFocus={()=>patch({}, false)} onChange={e=>patch({fontSize:Number(e.target.value)})}/></Field><Field label="크기 자동"><input type="checkbox" checked={el.keepIconScale} onChange={e=>patch({keepIconScale:e.target.checked}, true)}/></Field></> }
function ImageProps({el,patch}:{el:UIElement;patch:(p:Partial<UIElement>, immediate?:boolean)=>void}){ if(el.kind!=='image')return null; return <><h3>이미지 기본 속성</h3><Field label="fit"><select value={el.objectFit} onChange={e=>patch({objectFit:e.target.value as any}, true)}><option value="cover">cover</option><option value="contain">contain</option><option value="fill">fill</option></select></Field><div className="two"><Field label="초점 X"><input type="range" min="0" max="100" value={el.objectPositionX} onPointerDown={()=>patch({}, false)} onChange={e=>patch({objectPositionX:Number(e.target.value)})}/></Field><Field label="초점 Y"><input type="range" min="0" max="100" value={el.objectPositionY} onPointerDown={()=>patch({}, false)} onChange={e=>patch({objectPositionY:Number(e.target.value)})}/></Field><Field label="밝기"><input type="range" min="0" max="200" value={el.brightness} onPointerDown={()=>patch({}, false)} onChange={e=>patch({brightness:Number(e.target.value)})}/></Field><Field label="대비"><input type="range" min="0" max="200" value={el.contrast} onPointerDown={()=>patch({}, false)} onChange={e=>patch({contrast:Number(e.target.value)})}/></Field><Field label="색상/채도"><input type="range" min="0" max="220" value={el.saturation} onPointerDown={()=>patch({}, false)} onChange={e=>patch({saturation:Number(e.target.value)})}/></Field><Field label="선명도"><input type="range" min="0" max="200" value={el.sharpness} onPointerDown={()=>patch({}, false)} onChange={e=>patch({sharpness:Number(e.target.value), contrast:Number(e.target.value)})}/></Field></div><h3>UI 이미지 효과</h3><div className="effect-grid">{imageEffectPresets.map(effect=><button key={effect.id} title={effect.desc} className={el.effectPreset===effect.id?'active':''} onClick={()=>patch(effect.patch as Partial<UIElement>, true)}><b>{effect.name}</b><small>{effect.desc}</small></button>)}</div><div className="two"><Field label="흑백"><input type="range" min="0" max="100" value={el.grayscale} onPointerDown={()=>patch({}, false)} onChange={e=>patch({grayscale:Number(e.target.value)})}/></Field><Field label="블러"><input type="range" min="0" max="20" value={el.blur} onPointerDown={()=>patch({}, false)} onChange={e=>patch({blur:Number(e.target.value)})}/></Field><Field label="오버레이 색"><input type="color" value={el.overlayColor} onChange={e=>patch({overlayColor:e.target.value}, true)}/></Field><Field label="오버레이"><input type="range" min="0" max="1" step="0.01" value={el.overlayOpacity} onPointerDown={()=>patch({}, false)} onChange={e=>patch({overlayOpacity:Number(e.target.value)})}/></Field></div><Field label="원형 마스크"><input type="checkbox" checked={el.imageMask==='circle'} onChange={e=>patch({imageMask:e.target.checked?'circle':'rect'}, true)}/></Field></> }
function CanvasPanel({state,dispatch}:{state:EditorState;dispatch:React.Dispatch<EditorAction>}){ return <div className="panel-stack"><h3>캔버스</h3><div className="two"><Field label="W"><input type="number" value={state.canvasW} onChange={e=>dispatch({type:'SET_CANVAS', w:Number(e.target.value), h:state.canvasH, clamp:true})}/></Field><Field label="H"><input type="number" value={state.canvasH} onChange={e=>dispatch({type:'SET_CANVAS', w:state.canvasW, h:Number(e.target.value), clamp:true})}/></Field></div>{canvasPresets.map(p=><button key={p.id} onClick={()=>dispatch({type:'SET_CANVAS', w:p.w, h:p.h, clamp:true})}>{p.name}</button>)}<h3>Grid / Snap</h3><Field label="Grid"><input type="checkbox" checked={state.gridVisible} onChange={e=>dispatch({type:'SET_GRID', patch:{gridVisible:e.target.checked}})}/></Field><Field label="Snap"><input type="checkbox" checked={state.snapEnabled} onChange={e=>dispatch({type:'SET_GRID', patch:{snapEnabled:e.target.checked}})}/></Field><Field label="간격"><input type="number" value={state.gridSize} onChange={e=>dispatch({type:'SET_GRID', patch:{gridSize:Number(e.target.value)}})}/></Field><Field label="그리드 밝기"><div className="grid-opacity-steps">{[0.10,0.18,0.26,0.34,0.42].map((level, index)=><button key={level} type="button" className={Math.abs(state.gridOpacity-level)<0.01?'active':''} title={`밝기 ${index+1}단계`} onClick={()=>dispatch({type:'SET_GRID', patch:{gridOpacity:level}})}>{index+1}</button>)}</div></Field><Field label="Zoom"><input type="range" min="10" max="300" value={state.zoom} onChange={e=>dispatch({type:'SET_ZOOM', zoom:Number(e.target.value)})}/></Field><button onClick={()=>dispatch({type:'SET_PAN', pan:{x:0,y:0}})}>Pan 0</button></div> }
function CodePanel({state}:{state:EditorState}){ const react=buildReactExport(state.elements,state.canvasW,state.canvasH,state.tokens); const tail=buildTailwindExport(state.elements,state.canvasW,state.canvasH,state.tokens); return <div className="panel-stack"><h3>Export Code</h3><button onClick={()=>navigator.clipboard?.writeText(react)}>React 복사</button><button onClick={()=>navigator.clipboard?.writeText(tail)}>Tailwind 복사</button><textarea readOnly value={tail}/></div> }
