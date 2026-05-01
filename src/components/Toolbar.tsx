import type { Dispatch } from 'react';
import { iconDefs } from '../data/icons';
import { shapes } from '../data/shapes';
import { makeIcon, makeShape, makeText } from '../utils/elements';
import type { ActiveTool, EditorAction, EditorState, Panel } from '../types/editor';

function ToolButton({ label, icon, onClick, active }: { label: string; icon: string; onClick?: () => void; active?: boolean }) {
  return <button type="button" className={active ? 'active' : ''} title={label} aria-label={label} data-tip={label} onClick={onClick}>{icon}</button>;
}

function PanelButton({ label, icon, panel, dispatch }: { label: string; icon: string; panel: Panel; dispatch: Dispatch<EditorAction> }) {
  return <ToolButton label={label} icon={icon} onClick={() => dispatch({ type: 'SET_PANEL', panel })} />;
}

function ToolModeButton({ label, icon, tool, state, dispatch }: { label: string; icon: string; tool: ActiveTool; state: EditorState; dispatch: Dispatch<EditorAction> }) {
  return <ToolButton label={label} icon={icon} active={state.activeTool === tool} onClick={() => dispatch({ type: 'SET_ACTIVE_TOOL', tool })} />;
}

export function Toolbar({ state, dispatch }: { state: EditorState; dispatch: Dispatch<EditorAction> }) {
  const lastShape = shapes.find((shape) => shape.id === state.lastShapeId) ?? shapes.find((shape) => shape.id === 'roundRect') ?? shapes[0];
  const lastIconSymbol = state.lastIconSymbol || iconDefs[0].symbol;
  const lastIconName = state.lastIconName || iconDefs[0].name;

  return <aside className="toolbar" aria-label="Left tools">
    <ToolModeButton label="선택 / 이동 / 리사이즈 (V)" icon="⌖" tool="select" state={state} dispatch={dispatch} />
    <ToolModeButton label="사각형 드래그 생성 (R)" icon="▭" tool="rect" state={state} dispatch={dispatch} />
    <ToolModeButton label="원/타원 드래그 생성 (O)" icon="○" tool="ellipse" state={state} dispatch={dispatch} />
    <ToolModeButton label="선 드래그 생성 (L)" icon="╱" tool="line" state={state} dispatch={dispatch} />
    <ToolModeButton label="화살표 드래그 생성 (A)" icon="➜" tool="arrow" state={state} dispatch={dispatch} />
    <ToolModeButton label="자유 펜 그리기 (P)" icon="〰" tool="pen" state={state} dispatch={dispatch} />
    <hr />
    <ToolButton label="텍스트 추가" icon="T" onClick={() => dispatch({ type: 'ADD_ELEMENTS', elements: [makeText()] })} />
    <ToolButton
      label={`마지막 도형 추가 · ${lastShape?.name ?? '도형'}`}
      icon={lastShape?.mark ?? '▭'}
      onClick={() => dispatch({ type: 'ADD_ELEMENTS', elements: [makeShape(lastShape?.id ?? 'roundRect')] })}
    />
    <ToolButton
      label={`마지막 아이콘 추가 · ${lastIconName}`}
      icon={lastIconSymbol}
      onClick={() => dispatch({ type: 'ADD_ELEMENTS', elements: [makeIcon(lastIconSymbol, lastIconName)] })}
    />
    <ToolButton label="배경 설정" icon="▨" onClick={() => dispatch({ type: 'SET_PANEL', panel: 'background' })} />
    <ToolButton label="아이콘 제작" icon="🖌" onClick={() => dispatch({ type: 'SET_PANEL', panel: 'iconStudio' })} />
    <hr />
    <PanelButton label="도형 라이브러리" icon="▱" panel="shapes" dispatch={dispatch} />
    <PanelButton label="아이콘 라이브러리" icon="★" panel="icons" dispatch={dispatch} />
    <PanelButton label="샘플 UI" icon="▦" panel="samples" dispatch={dispatch} />
  </aside>;
}

