import { useRef } from 'react';
import type { EditorAction, EditorState, ProjectData, UIElement } from '../types/editor';
import { makeImage } from '../utils/elements';
import { buildHtmlExport, buildReactExport, buildSvg, buildTailwindExport, saveText, saveSvg, svgToPng } from '../utils/export';
import { tokensToCss } from '../data/styles';
import { PROJECT_KEY } from '../store/editorReducer';
import { APP_NAME, APP_VERSION } from '../data/appMeta';

async function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = reject; r.readAsDataURL(file); });
}
async function readFileAsText(file: File) {
  return new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = reject; r.readAsText(file); });
}
function projectData(state: EditorState): ProjectData {
  return { version: 95, canvas: { w: state.canvasW, h: state.canvasH }, elements: state.elements, tokens: state.tokens, customComponents: state.customComponents, customIcons: state.customIcons, savedAt: new Date().toISOString() };
}
function storageErrorMessage(error: unknown) {
  const name = (error as { name?: string })?.name ?? '';
  if (name.includes('Quota')) return '브라우저 저장 실패 · 이미지 용량이 커서 localStorage 한도를 초과했을 수 있습니다. JSON 저장을 사용하세요.';
  return '브라우저 저장 실패 · 브라우저 권한 또는 저장소 용량을 확인하세요.';
}

export function TopBar({ state, dispatch }: { state: EditorState; dispatch: React.Dispatch<EditorAction> }) {
  const jsonInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const saveProject = () => {
    try {
      localStorage.setItem(PROJECT_KEY, JSON.stringify(projectData(state)));
      dispatch({ type:'SET_STATUS', status:'브라우저 저장 완료' });
    } catch (error) {
      dispatch({ type:'SET_STATUS', status: storageErrorMessage(error) });
    }
  };
  const loadProject = () => {
    try {
      const raw = localStorage.getItem(PROJECT_KEY);
      if (!raw) return dispatch({ type:'SET_STATUS', status:'저장된 프로젝트 없음' });
      const p = JSON.parse(raw) as ProjectData;
      dispatch({ type:'LOAD_PROJECT', project: p, status:'브라우저 불러오기 완료' });
    } catch {
      dispatch({ type:'SET_STATUS', status:'브라우저 불러오기 실패' });
    }
  };
  const openJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const p = JSON.parse(await readFileAsText(file)) as ProjectData;
      dispatch({ type: 'LOAD_PROJECT', project: p, status: `JSON 열기 완료 · ${file.name}` });
    } catch {
      dispatch({ type: 'SET_STATUS', status: 'JSON 열기 실패 · 파일 구조를 확인하세요' });
    } finally {
      e.target.value = '';
    }
  };
  const exportJson = async () => {
    const mode = await saveText('ui-graphic-studio-project.json', JSON.stringify(projectData(state), null, 2), 'application/json;charset=utf-8');
    dispatch({ type:'SET_STATUS', status:`JSON 저장: ${mode}` });
  };
  const exportPng = async () => {
    const svg = buildSvg(state.elements, state.canvasW, state.canvasH, state.tokens);
    const r = await svgToPng(svg, state.canvasW, state.canvasH, 'ui-graphic-studio-canvas.png');
    dispatch({ type:'SET_STATUS', status:r.ok?'전체 PNG 저장 완료':'PNG 제한으로 SVG 저장' });
  };
  const exportSvg = async () => {
    const svg = buildSvg(state.elements, state.canvasW, state.canvasH, state.tokens);
    const mode = await saveSvg('ui-graphic-studio-canvas.svg', svg);
    dispatch({ type:'SET_STATUS', status:`SVG 저장: ${mode}` });
  };
  const importImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const images = await Promise.all(files.map(async f => makeImage(await readFileAsDataUrl(f), f.name)));
    if (images.length) dispatch({ type:'ADD_ELEMENTS', elements: images });
    e.target.value='';
  };
  const iconButton = (label: string, icon: string, onClick: () => void, tone = '') => (
    <button type="button" className={`icon-action ${tone}`} title={label} aria-label={label} data-tip={label} onClick={onClick}>{icon}</button>
  );

  return <header className="topbar">
    <div className="brand" aria-label="Application brand">
      <div className="brand-mark">UG</div>
      <div className="brand-text"><b>{APP_NAME}</b><span>v{APP_VERSION}</span></div>
    </div>
    <input ref={jsonInputRef} type="file" accept="application/json,.json" className="hidden-input" onChange={openJsonFile} />
    <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden-input" onChange={importImage} />
    <div className="top-actions" aria-label="Top menu">
      {iconButton('새 작업', '＋', ()=>dispatch({type:'NEW_PROJECT'}), 'primary')}
      {iconButton('실행 취소', '↶', ()=>dispatch({type:'UNDO'}))}
      {iconButton('다시 실행', '↷', ()=>dispatch({type:'REDO'}))}
      <span className="action-separator" />
      {iconButton('브라우저 저장', '💾', saveProject)}
      {iconButton('브라우저 불러오기', '↥', loadProject)}
      {iconButton('JSON 열기', '📂', ()=>jsonInputRef.current?.click(), 'green')}
      {iconButton('JSON 저장', '{}', exportJson, 'green')}
      <span className="action-separator" />
      {iconButton('전체 PNG 저장', '▣', exportPng, 'blue')}
      {iconButton('전체 SVG 저장', '◇', exportSvg)}
      {iconButton('토큰 CSS 저장', 'CSS', ()=>saveText('tokens.css', tokensToCss(state.tokens), 'text/css;charset=utf-8'))}
      <span className="action-separator" />
      {iconButton('React TSX Export', '⚛', ()=>saveText('exported-ui.tsx', buildReactExport(state.elements,state.canvasW,state.canvasH,state.tokens), 'text/plain;charset=utf-8'))}
      {iconButton('Tailwind JSX Export', 'TW', ()=>saveText('exported-ui-tailwind.tsx', buildTailwindExport(state.elements,state.canvasW,state.canvasH,state.tokens), 'text/plain;charset=utf-8'))}
      {iconButton('HTML Export', '</>', ()=>saveText('exported-ui.html', buildHtmlExport(state.elements,state.canvasW,state.canvasH,state.tokens), 'text/html;charset=utf-8'))}
      {iconButton('이미지 불러오기', '▧', ()=>imageInputRef.current?.click())}
    </div>
  </header>;
}
