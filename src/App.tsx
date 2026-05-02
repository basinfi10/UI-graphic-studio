import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { Dispatch, MouseEvent } from 'react';
import './App.css';
import { CanvasView } from './components/canvas/CanvasView';
import { RightPanel } from './components/panels/RightPanel';
import { Toolbar } from './components/Toolbar';
import { TopBar } from './components/TopBar';
import { createInitialState, editorReducer, PROJECT_KEY } from './store/editorReducer';
import { clamp, cloneElement, deepCopy } from './utils/elements';
import { buildLayerSvg, saveSvg, svgToPng } from './utils/export';
import type { EditorAction, Panel, UIElement } from './types/editor';
import { APP_VERSION } from './data/appMeta';


const WORKSPACE_PANELS: { id: Panel; label: string; icon: string }[] = [
  { id: 'background', label: '배경', icon: '▨' },
  { id: 'shapes', label: '도형', icon: '▭' },
  { id: 'icons', label: '아이콘', icon: '✦' },
  { id: 'iconStudio', label: '아이콘 제작', icon: '🖌' },
  { id: 'samples', label: '샘플 UI', icon: '▣' },
  { id: 'webSamples', label: '웹 샘플 레이어', icon: '🌐' },
  { id: 'components', label: '컴포넌트', icon: '▤' },
  { id: 'styles', label: '스타일', icon: '◐' },
  { id: 'tokens', label: '토큰', icon: '🎨' },
  { id: 'layout', label: '정렬/분배', icon: '⇄' },
  { id: 'layers', label: '레이어', icon: '☰' },
  { id: 'props', label: '속성', icon: '⚙' },
  { id: 'canvas', label: '캔버스/그리드', icon: '▥' },
  { id: 'code', label: '코드 Export', icon: '</>' },
];

function WorkspacePanelNav({ active, dispatch }: { active: Panel; dispatch: Dispatch<EditorAction> }) {
  return <nav className="workspace-panel-nav" aria-label="Workspace panels">
    <div className="workspace-panel-nav-inner">
      {WORKSPACE_PANELS.map((panel) => <button
        key={panel.id}
        type="button"
        className={active === panel.id ? 'active' : ''}
        title={panel.label}
        aria-label={panel.label}
        data-tip={panel.label}
        onClick={() => dispatch({ type: 'SET_PANEL', panel: panel.id })}
      >{panel.icon}</button>)}
    </div>
  </nav>;
}

export default function App() {
  const [state, dispatch] = useReducer(editorReducer, undefined, createInitialState);
  const stateRef = useRef(state);
  const clipboardRef = useRef<UIElement[]>([]);
  const [layerMenu, setLayerMenu] = useState<{ x: number; y: number; id: string } | null>(null);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  stateRef.current = state;

  const menuTarget = layerMenu ? state.elements.find((el) => el.id === layerMenu.id) : null;
  const menuW = 228;
  const menuH = 430;
  const menuX = layerMenu ? Math.max(8, Math.min(layerMenu.x, Math.max(8, window.innerWidth - menuW - 8))) : 0;
  const menuY = layerMenu ? Math.max(8, Math.min(layerMenu.y, Math.max(8, window.innerHeight - menuH - 8))) : 0;
  const menuIds = layerMenu
    ? (state.selectedIds.includes(layerMenu.id) ? state.selectedIds : [layerMenu.id])
    : [];

  const openLayerMenu = useCallback((event: MouseEvent, id: string) => {
    event.preventDefault();
    event.stopPropagation();
    const s = stateRef.current;
    if (!s.selectedIds.includes(id)) dispatch({ type: 'SELECT', ids: [id] });
    setLayerMenu({ x: event.clientX, y: event.clientY, id });
  }, []);

  const closeLayerMenu = useCallback(() => setLayerMenu(null), []);

  const copyMenuLayers = useCallback(() => {
    const s = stateRef.current;
    const ids = menuIds.length ? menuIds : s.selectedIds;
    clipboardRef.current = deepCopy(s.elements.filter((el) => ids.includes(el.id)));
    dispatch({ type: 'SET_STATUS', status: `${clipboardRef.current.length}개 레이어 복사` });
    closeLayerMenu();
  }, [menuIds, closeLayerMenu]);

  const pasteMenuLayers = useCallback(() => {
    const s = stateRef.current;
    const clones = clipboardRef.current.map((el, index) => {
      const clone = cloneElement(el, s.canvasW, s.canvasH, 28 + index * 6);
      clone.groupId = el.groupId;
      return clone;
    });
    if (!clones.length) {
      dispatch({ type: 'SET_STATUS', status: '붙여넣을 레이어가 없습니다' });
      closeLayerMenu();
      return;
    }
    dispatch({ type: 'ADD_ELEMENTS', elements: clones });
    dispatch({ type: 'SET_STATUS', status: `${clones.length}개 레이어 붙여넣기` });
    closeLayerMenu();
  }, [closeLayerMenu]);

  const duplicateMenuLayers = useCallback(() => {
    const s = stateRef.current;
    const ids = menuIds.length ? menuIds : s.selectedIds;
    const clones = s.elements.filter((el) => ids.includes(el.id)).map((el, index) => cloneElement(el, s.canvasW, s.canvasH, 26 + index * 5));
    if (clones.length) dispatch({ type: 'ADD_ELEMENTS', elements: clones });
    closeLayerMenu();
  }, [menuIds, closeLayerMenu]);

  const deleteMenuLayers = useCallback(() => {
    const ids = menuIds.length ? menuIds : stateRef.current.selectedIds;
    if (!ids.length) return;
    const next = stateRef.current.elements.filter((el) => !ids.includes(el.id));
    dispatch({ type: 'REPLACE_ELEMENTS', elements: next, selectedIds: [], status: `${ids.length}개 레이어 삭제` });
    closeLayerMenu();
  }, [menuIds, closeLayerMenu]);

  const setLayerOrder = useCallback((direction: 'front' | 'back' | 'forward' | 'backward') => {
    const ids = menuIds.length ? menuIds : stateRef.current.selectedIds;
    if (ids.length) dispatch({ type: 'LAYER_ORDER', ids, direction });
    closeLayerMenu();
  }, [menuIds, closeLayerMenu]);

  const toggleMenuLayer = useCallback((patch: Partial<UIElement>, status: string) => {
    const ids = menuIds.length ? menuIds : stateRef.current.selectedIds;
    if (ids.length) dispatch({ type: 'UPDATE_ELEMENTS', ids, patch, status });
    closeLayerMenu();
  }, [menuIds, closeLayerMenu]);

  const saveMenuLayerPng = useCallback(async () => {
    const s = stateRef.current;
    const target = layerMenu ? s.elements.find((el) => el.id === layerMenu.id) : s.elements.find((el) => el.id === s.selectedIds[0]);
    if (!target) return;
    const { svg, width, height } = buildLayerSvg(target, s.tokens);
    const safeName = target.name.replace(/[^a-zA-Z0-9가-힣_-]+/g, '_') || 'layer';
    const result = await svgToPng(svg, width, height, `${safeName}.png`);
    dispatch({ type: 'SET_STATUS', status: result.ok ? `${target.name} PNG 저장 완료` : `${target.name} PNG 제한으로 SVG 저장` });
    closeLayerMenu();
  }, [layerMenu, closeLayerMenu]);

  const saveMenuLayerSvg = useCallback(async () => {
    const s = stateRef.current;
    const target = layerMenu ? s.elements.find((el) => el.id === layerMenu.id) : s.elements.find((el) => el.id === s.selectedIds[0]);
    if (!target) return;
    const { svg } = buildLayerSvg(target, s.tokens);
    const safeName = target.name.replace(/[^a-zA-Z0-9가-힣_-]+/g, '_') || 'layer';
    const mode = await saveSvg(`${safeName}.svg`, svg);
    dispatch({ type: 'SET_STATUS', status: `${target.name} SVG 저장: ${mode}` });
    closeLayerMenu();
  }, [layerMenu, closeLayerMenu]);

  const handleKey = useCallback((event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || Boolean(target?.isContentEditable);
    if (typing) return;
    if (event.key === 'Escape') { setLayerMenu(null); return; }
    const s = stateRef.current;
    const key = event.key.toLowerCase();
    const mod = event.ctrlKey || event.metaKey;
    if (!mod && key === 'v') { event.preventDefault(); dispatch({ type: 'SET_ACTIVE_TOOL', tool: 'select' }); return; }
    if (!mod && key === 'r') { event.preventDefault(); dispatch({ type: 'SET_ACTIVE_TOOL', tool: 'rect' }); return; }
    if (!mod && key === 'o') { event.preventDefault(); dispatch({ type: 'SET_ACTIVE_TOOL', tool: 'ellipse' }); return; }
    if (!mod && key === 'l') { event.preventDefault(); dispatch({ type: 'SET_ACTIVE_TOOL', tool: 'line' }); return; }
    if (!mod && key === 'a') { event.preventDefault(); dispatch({ type: 'SET_ACTIVE_TOOL', tool: 'arrow' }); return; }
    if (!mod && key === 'p') { event.preventDefault(); dispatch({ type: 'SET_ACTIVE_TOOL', tool: 'pen' }); return; }
    if (mod && key === 'z' && event.shiftKey) { event.preventDefault(); dispatch({ type: 'REDO' }); return; }
    if (mod && key === 'z') { event.preventDefault(); dispatch({ type: 'UNDO' }); return; }
    if (mod && key === 'a') { event.preventDefault(); dispatch({ type: 'SELECT', ids: s.elements.filter(el=>el.visible&&!el.locked).map(el=>el.id) }); return; }
    if (mod && key === 'g' && event.shiftKey) { event.preventDefault(); dispatch({ type: 'UNGROUP_SELECTION' }); return; }
    if (mod && key === 'g') { event.preventDefault(); dispatch({ type: 'GROUP_SELECTION' }); return; }
    if (mod && key === 'd') { event.preventDefault(); dispatch({ type: 'DUPLICATE_SELECTION' }); return; }
    if (mod && key === 'n') { event.preventDefault(); dispatch({ type: 'NEW_PROJECT' }); return; }
    if (mod && key === 's') {
      event.preventDefault();
      try {
        localStorage.setItem(PROJECT_KEY, JSON.stringify({ version: Number(APP_VERSION.replace(/\D/g, '')) || 95, canvas: { w: s.canvasW, h: s.canvasH }, elements: s.elements, tokens: s.tokens, customComponents: s.customComponents, customIcons: s.customIcons, savedAt: new Date().toISOString() }));
        dispatch({ type: 'SET_STATUS', status: '브라우저 저장 완료' });
      } catch {
        dispatch({ type: 'SET_STATUS', status: '브라우저 저장 실패 · 이미지 용량이 커서 localStorage 한도를 초과했을 수 있습니다. JSON 저장을 사용하세요.' });
      }
      return;
    }
    if (key === 'delete' || key === 'backspace') { event.preventDefault(); dispatch({ type: 'DELETE_SELECTION' }); return; }
    if (key === 'f') { event.preventDefault(); window.dispatchEvent(new Event('uigs-fit-canvas')); return; }
    if (key === '0') { event.preventDefault(); dispatch({ type: 'SET_ZOOM', zoom: 100 }); dispatch({ type: 'SET_PAN', pan: { x: 0, y: 0 } }); return; }
    if (key === '=' || key === '+') { event.preventDefault(); dispatch({ type: 'SET_ZOOM', zoom: s.zoom + 12 }); return; }
    if (key === '-' || key === '_') { event.preventDefault(); dispatch({ type: 'SET_ZOOM', zoom: s.zoom - 12 }); return; }
    if (['arrowleft','arrowright','arrowup','arrowdown'].includes(key) && s.selectedIds.length) {
      event.preventDefault();
      const step = event.ctrlKey ? 1 : event.shiftKey ? s.gridSize * 10 : s.gridSize;
      const dx = key === 'arrowleft' ? -step : key === 'arrowright' ? step : 0;
      const dy = key === 'arrowup' ? -step : key === 'arrowdown' ? step : 0;
      dispatch({ type: 'MOVE_ELEMENTS', ids: s.selectedIds, dx, dy, status: `방향키 이동 ${step}px` });
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  return <div className="app" onPointerDown={closeLayerMenu} onDragOver={(e)=>e.preventDefault()}>
    <TopBar state={state} dispatch={dispatch} />
    <WorkspacePanelNav active={state.panel} dispatch={dispatch} />
    <div className={`workspace ${rightCollapsed ? 'right-collapsed' : ''}`}>
      <Toolbar state={state} dispatch={dispatch} />
      <CanvasView state={state} dispatch={dispatch} onOpenLayerMenu={openLayerMenu} />
      {!rightCollapsed && <RightPanel state={state} dispatch={dispatch} onOpenLayerMenu={openLayerMenu} onCollapse={() => setRightCollapsed(true)} />}
      {rightCollapsed && <button type="button" className="right-panel-restore" title="오른쪽 패널 펼치기" onClick={() => setRightCollapsed(false)}>◀</button>}
    </div>
    {layerMenu && menuTarget && <div className="context-menu" style={{ left: menuX, top: menuY }} onPointerDown={(event)=>event.stopPropagation()} onContextMenu={(event)=>event.preventDefault()}>
      <div className="context-menu-head"><b>{menuTarget.name}</b><span>{menuTarget.kind} · {Math.round(menuTarget.w)}×{Math.round(menuTarget.h)}</span></div>
      <button onClick={saveMenuLayerPng}>▣ <span>레이어 PNG 저장</span></button>
      <button onClick={saveMenuLayerSvg}>◇ <span>레이어 SVG 저장</span></button>
      <div className="context-sep" />
      <button onClick={copyMenuLayers}>⧉ <span>복사</span></button>
      <button onClick={pasteMenuLayers}>▣ <span>붙여넣기</span></button>
      <button onClick={duplicateMenuLayers}>⧉+ <span>복제</span></button>
      <button onClick={deleteMenuLayers} className="danger">⌫ <span>삭제</span></button>
      <div className="context-sep" />
      <button onClick={()=>setLayerOrder('front')}>⇧ <span>레이어 맨앞</span></button>
      <button onClick={()=>setLayerOrder('forward')}>↑ <span>레이어 1앞</span></button>
      <button onClick={()=>setLayerOrder('backward')}>↓ <span>레이어 1뒤</span></button>
      <button onClick={()=>setLayerOrder('back')}>⇩ <span>레이어 맨뒤</span></button>
      <div className="context-sep" />
      <button onClick={()=>toggleMenuLayer({ locked: !menuTarget.locked }, menuTarget.locked ? '레이어 잠금 해제' : '레이어 잠금')}>{menuTarget.locked ? '🔓' : '🔒'} <span>{menuTarget.locked ? '잠금 해제' : '잠금'}</span></button>
      <button onClick={()=>toggleMenuLayer({ visible: !menuTarget.visible }, menuTarget.visible ? '레이어 숨김' : '레이어 표시')}>{menuTarget.visible ? '◌' : '◉'} <span>{menuTarget.visible ? '숨기기' : '표시'}</span></button>
    </div>}
    <div className="statusbar"><span>{state.selectedIds.length ? `${state.selectedIds.length} selected` : 'No selection'}</span><span>Zoom {Math.round(state.zoom)}%</span><span>{state.canvasW}×{state.canvasH}</span><span>{clamp(state.history.length,0,999)} undo</span></div>
  </div>;
}
