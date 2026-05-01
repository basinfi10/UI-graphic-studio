import { defaultTokens, DEFAULT_CANVAS_H, DEFAULT_CANVAS_W } from '../data/shapes';
import type { CustomComponent, CustomIcon, DesignTokens, EditorAction, EditorSnapshot, EditorState, ProjectData, UIElement } from '../types/editor';
import { clamp, cloneElement, deepCopy, defaultElements, sanitizeElements } from '../utils/elements';

const HISTORY_LIMIT = 120;
export const CUSTOM_COMPONENTS_KEY = 'ui-graphic-studio-pro-custom-components-v2';
export const CUSTOM_ICONS_KEY = 'ui-graphic-studio-pro-custom-icons-v1';
export const DESIGN_TOKENS_KEY = 'ui-graphic-studio-pro-design-tokens-v2';
export const PROJECT_KEY = 'ui-graphic-studio-pro-project-v3';

function snapshot(state: EditorState): EditorSnapshot {
  return {
    elements: deepCopy(state.elements),
    selectedIds: [...state.selectedIds],
    canvasW: state.canvasW,
    canvasH: state.canvasH,
    tokens: { ...state.tokens },
    customComponents: state.customComponents.map((c) => ({ ...c, elements: deepCopy(c.elements) })),
    customIcons: state.customIcons.map((icon) => ({ ...icon })),
  };
}

function withHistory(state: EditorState, patch: Partial<EditorState>, status?: string): EditorState {
  return {
    ...state,
    ...patch,
    status: status ?? patch.status ?? state.status,
    history: [...state.history, snapshot(state)].slice(-HISTORY_LIMIT),
    future: [],
    transientSnapshot: null,
  };
}

function selected(state: EditorState) {
  return state.elements.filter((el) => state.selectedIds.includes(el.id));
}
function groupId() {
  return `group-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function loadStoredComponents(): CustomComponent[] {
  try {
    const raw = JSON.parse(localStorage.getItem(CUSTOM_COMPONENTS_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}
function loadStoredIcons(): CustomIcon[] {
  try {
    const raw = JSON.parse(localStorage.getItem(CUSTOM_ICONS_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}
function loadStoredTokens(): DesignTokens {
  try {
    return { ...defaultTokens, ...JSON.parse(localStorage.getItem(DESIGN_TOKENS_KEY) || '{}') };
  } catch {
    return defaultTokens;
  }
}

export function createInitialState(): EditorState {
  return {
    elements: defaultElements,
    selectedIds: [defaultElements[0].id],
    canvasW: DEFAULT_CANVAS_W,
    canvasH: DEFAULT_CANVAS_H,
    tokens: loadStoredTokens(),
    customComponents: loadStoredComponents(),
    customIcons: loadStoredIcons(),
    panel: 'shapes',
    zoom: 65,
    pan: { x: 0, y: 0 },
    gridVisible: true,
    snapEnabled: true,
    gridSize: 10,
    gridOpacity: 0.22,
    history: [],
    future: [],
    transientSnapshot: null,
    status: '준비됨',
    activeTool: 'select',
    guides: [],
    editingTextId: null,
    foldedGroups: [],
    lastShapeId: 'roundRect',
    lastIconSymbol: '✦',
    lastIconName: 'Spark',
  };
}

function clampElements(elements: UIElement[], canvasW: number, canvasH: number) {
  let changed = 0;
  const next = elements.map((el) => {
    const w = clamp(el.w, 10, Math.max(10, canvasW));
    const h = clamp(el.h, 10, Math.max(10, canvasH));
    const x = clamp(el.x, 0, Math.max(0, canvasW - w));
    const y = clamp(el.y, 0, Math.max(0, canvasH - h));
    if (x !== el.x || y !== el.y || w !== el.w || h !== el.h) changed += 1;
    return { ...el, x, y, w, h } as UIElement;
  });
  return { next, changed };
}

function normalizeProject(project: ProjectData) {
  const canvasW = clamp(Number(project.canvas?.w ?? DEFAULT_CANVAS_W), 120, 4096);
  const canvasH = clamp(Number(project.canvas?.h ?? DEFAULT_CANVAS_H), 120, 4096);
  const elements = sanitizeElements(project.elements, canvasW, canvasH);
  const tokens = { ...defaultTokens, ...(project.tokens ?? {}) };
  const customComponents = Array.isArray(project.customComponents) ? project.customComponents : [];
  const customIcons = Array.isArray(project.customIcons) ? project.customIcons : [];
  return { canvasW, canvasH, elements, tokens, customComponents, customIcons };
}

function saveLocalStorageSafely(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'NEW_PROJECT':
      return withHistory(state, { elements: [], selectedIds: [], pan: { x: 0, y: 0 }, activeTool: 'select', editingTextId: null, guides: [] }, '새 작업 시작');
    case 'LOAD_PROJECT': {
      const project = normalizeProject(action.project);
      return withHistory(state, {
        elements: project.elements,
        selectedIds: [],
        canvasW: project.canvasW,
        canvasH: project.canvasH,
        tokens: project.tokens,
        customComponents: project.customComponents,
        customIcons: project.customIcons,
        guides: [],
        editingTextId: null,
        foldedGroups: [],
      }, action.status ?? `프로젝트 불러오기 완료 · ${project.elements.length}개 레이어`);
    }
    case 'SET_PANEL': return { ...state, panel: action.panel };
    case 'SET_STATUS': return { ...state, status: action.status };
    case 'SET_ACTIVE_TOOL': return { ...state, activeTool: action.tool, status: action.tool === 'select' ? '선택 도구' : `${action.tool} 도구 · 캔버스에서 드래그해 생성` };
    case 'SET_LAST_ASSET': return { ...state, lastShapeId: action.lastShapeId ?? state.lastShapeId, lastIconSymbol: action.lastIconSymbol ?? state.lastIconSymbol, lastIconName: action.lastIconName ?? state.lastIconName };
    case 'SET_ZOOM': return { ...state, zoom: clamp(action.zoom, 10, 400) };
    case 'SET_PAN': return { ...state, pan: action.pan };
    case 'SET_GUIDES': return { ...state, guides: action.guides };
    case 'SET_GRID': return { ...state, ...action.patch, gridSize: clamp(Number(action.patch.gridSize ?? state.gridSize), 2, 120), gridOpacity: clamp(Number(action.patch.gridOpacity ?? state.gridOpacity), 0.05, 0.6) };
    case 'BEGIN_TRANSIENT': return state.transientSnapshot ? state : { ...state, transientSnapshot: snapshot(state) };
    case 'COMMIT_TRANSIENT': {
      if (!state.transientSnapshot) return state;
      return {
        ...state,
        history: [...state.history, state.transientSnapshot].slice(-HISTORY_LIMIT),
        future: [],
        transientSnapshot: null,
        status: action.status ?? state.status,
      };
    }
    case 'SELECT': {
      const ids = action.additive ? Array.from(new Set([...state.selectedIds, ...action.ids])) : action.ids;
      return { ...state, selectedIds: ids.filter((id) => state.elements.some((el) => el.id === id)), editingTextId: null };
    }
    case 'SET_EDITING_TEXT': return { ...state, editingTextId: action.id };
    case 'SET_CANVAS': {
      const canvasW = clamp(action.w, 120, 4096), canvasH = clamp(action.h, 120, 4096);
      const { next, changed } = action.clamp ? clampElements(state.elements, canvasW, canvasH) : { next: state.elements, changed: 0 };
      return withHistory(state, { canvasW, canvasH, elements: next }, changed ? `캔버스 변경 · ${changed}개 레이어 자동 보정` : '캔버스 변경');
    }
    case 'ADD_ELEMENTS': {
      const elements = [...state.elements, ...action.elements];
      return withHistory(state, { elements, selectedIds: action.select === false ? state.selectedIds : action.elements.map((el) => el.id) }, '요소 추가');
    }
    case 'UPDATE_ELEMENTS': {
      const ids = action.ids.length ? action.ids : state.selectedIds;
      const next = state.elements.map((el) => ids.includes(el.id) ? ({ ...el, ...action.patch } as UIElement) : el);
      return action.commit === false ? { ...state, elements: next, status: action.status ?? state.status } : withHistory(state, { elements: next }, action.status ?? '속성 변경');
    }
    case 'MOVE_ELEMENTS': {
      const ids = action.ids.length ? action.ids : state.selectedIds;
      const next = state.elements.map((el) => ids.includes(el.id) && !el.locked ? { ...el, x: clamp(el.x + action.dx, 0, Math.max(0, state.canvasW - el.w)), y: clamp(el.y + action.dy, 0, Math.max(0, state.canvasH - el.h)) } as UIElement : el);
      return action.commit === false ? { ...state, elements: next, status: action.status ?? state.status } : withHistory(state, { elements: next }, action.status ?? '이동');
    }
    case 'REPLACE_ELEMENTS': return withHistory(state, { elements: action.elements, selectedIds: action.selectedIds ?? state.selectedIds }, action.status ?? '교체');
    case 'DELETE_SELECTION': return state.selectedIds.length ? withHistory(state, { elements: state.elements.filter((el) => !state.selectedIds.includes(el.id)), selectedIds: [] }, '삭제') : state;
    case 'DUPLICATE_SELECTION': {
      const clones = selected(state).map((el) => cloneElement(el, state.canvasW, state.canvasH));
      return clones.length ? withHistory(state, { elements: [...state.elements, ...clones], selectedIds: clones.map((c) => c.id) }, '복제') : state;
    }
    case 'GROUP_SELECTION': {
      if (state.selectedIds.length < 2) return { ...state, status: '그룹화하려면 2개 이상 선택하세요' };
      const gid = groupId();
      return withHistory(state, { elements: state.elements.map((el) => state.selectedIds.includes(el.id) ? { ...el, groupId: gid } as UIElement : el) }, '그룹화');
    }
    case 'UNGROUP_SELECTION': {
      const selectedGroups = new Set(selected(state).map((el) => el.groupId).filter(Boolean) as string[]);
      return withHistory(state, { elements: state.elements.map((el) => selectedGroups.has(el.groupId ?? '') || state.selectedIds.includes(el.id) ? { ...el, groupId: undefined } as UIElement : el) }, '그룹 해제');
    }
    case 'LAYER_ORDER': {
      const ids = action.ids.length ? action.ids : state.selectedIds;
      const moving = state.elements.filter((el) => ids.includes(el.id));
      const rest = state.elements.filter((el) => !ids.includes(el.id));
      let elements = state.elements;
      if (action.direction === 'front') elements = [...rest, ...moving];
      if (action.direction === 'back') elements = [...moving, ...rest];
      if (action.direction === 'forward') {
        elements = [...state.elements];
        [...ids].reverse().forEach((id) => { const i = elements.findIndex((el) => el.id === id); if (i >= 0 && i < elements.length - 1) [elements[i], elements[i + 1]] = [elements[i + 1], elements[i]]; });
      }
      if (action.direction === 'backward') {
        elements = [...state.elements];
        ids.forEach((id) => { const i = elements.findIndex((el) => el.id === id); if (i > 0) [elements[i], elements[i - 1]] = [elements[i - 1], elements[i]]; });
      }
      return withHistory(state, { elements }, '레이어 순서 변경');
    }
    case 'ADD_CUSTOM_COMPONENT': {
      const customComponents = [...state.customComponents, action.component];
      const ok = saveLocalStorageSafely(CUSTOM_COMPONENTS_KEY, JSON.stringify(customComponents));
      return withHistory(state, { customComponents }, ok ? '사용자 컴포넌트 저장' : '사용자 컴포넌트 저장 실패 · 브라우저 저장소 용량을 확인하세요');
    }
    case 'DELETE_CUSTOM_COMPONENT': {
      const customComponents = state.customComponents.filter((c) => c.id !== action.id);
      saveLocalStorageSafely(CUSTOM_COMPONENTS_KEY, JSON.stringify(customComponents));
      return withHistory(state, { customComponents }, '사용자 컴포넌트 삭제');
    }
    case 'ADD_CUSTOM_ICON': {
      const customIcons = [...state.customIcons, action.icon];
      const ok = saveLocalStorageSafely(CUSTOM_ICONS_KEY, JSON.stringify(customIcons));
      return withHistory(state, { customIcons }, ok ? '사용자 아이콘 저장' : '사용자 아이콘 저장 실패 · 브라우저 저장소 용량을 확인하세요');
    }
    case 'DELETE_CUSTOM_ICON': {
      const customIcons = state.customIcons.filter((icon) => icon.id !== action.id);
      saveLocalStorageSafely(CUSTOM_ICONS_KEY, JSON.stringify(customIcons));
      return withHistory(state, { customIcons }, '사용자 아이콘 삭제');
    }
    case 'SET_TOKENS': {
      const ok = saveLocalStorageSafely(DESIGN_TOKENS_KEY, JSON.stringify(action.tokens));
      return withHistory(state, { tokens: action.tokens }, ok ? '디자인 토큰 변경' : '디자인 토큰 저장 실패 · 브라우저 저장소 용량을 확인하세요');
    }
    case 'TOGGLE_GROUP_FOLD': return { ...state, foldedGroups: state.foldedGroups.includes(action.groupId) ? state.foldedGroups.filter((id) => id !== action.groupId) : [...state.foldedGroups, action.groupId] };
    case 'UNDO': {
      const prev = state.history[state.history.length - 1];
      if (!prev) return state;
      const current = snapshot(state);
      return { ...state, ...prev, history: state.history.slice(0, -1), future: [current, ...state.future], status: '실행 취소', transientSnapshot: null };
    }
    case 'REDO': {
      const next = state.future[0];
      if (!next) return state;
      const current = snapshot(state);
      return { ...state, ...next, history: [...state.history, current].slice(-HISTORY_LIMIT), future: state.future.slice(1), status: '다시 실행', transientSnapshot: null };
    }
    default: return state;
  }
}
