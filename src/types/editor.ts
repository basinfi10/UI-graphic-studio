export type ElementKind = 'shape' | 'text' | 'icon' | 'image';
export type Panel = 'background' | 'shapes' | 'icons' | 'iconStudio' | 'samples' | 'components' | 'styles' | 'tokens' | 'layout' | 'layers' | 'props' | 'canvas' | 'files' | 'code';
export type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
export type Align = 'left' | 'center' | 'right';
export type VAlign = 'start' | 'center' | 'end';
export type ObjectFit = 'cover' | 'contain' | 'fill';
export type ImageMask = 'rect' | 'circle';
export type StrokeStyle = 'solid' | 'dashed' | 'dotted';
export type StrokeCap = 'butt' | 'round' | 'square';
export type StrokeJoin = 'miter' | 'round' | 'bevel';
export type ActiveTool = 'select' | 'rect' | 'ellipse' | 'line' | 'arrow' | 'pen';
export type BooleanOp = 'none' | 'union' | 'subtract' | 'intersect' | 'exclude';
export type SaveMode = 'picked' | 'download' | 'cancelled' | 'failed';

export interface ShadowStyle {
  enabled: boolean;
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
  opacity: number;
}

export interface EmbossStyle {
  enabled: boolean;
  depth: number;
  softness: number;
  highlightOpacity: number;
  shadowOpacity: number;
}

export interface BaseElement {
  id: string;
  groupId?: string;
  kind: ElementKind;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  fillEnabled: boolean;
  stroke: string;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  strokeCap: StrokeCap;
  strokeJoin: StrokeJoin;
  booleanOp?: BooleanOp;
  radius: number;
  opacity: number;
  rotate: number;
  visible: boolean;
  locked: boolean;
  shadow?: ShadowStyle;
  emboss?: EmbossStyle;
}

export interface TextStyle {
  text?: string;
  textColor?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  fontStyle?: 'normal' | 'italic';
  textAlign?: Align;
  verticalAlign?: VAlign;
  letterSpacing?: number;
  lineHeight?: number;
  textDecoration?: 'none' | 'underline' | 'line-through';
}

export interface ShapeElement extends BaseElement, TextStyle {
  kind: 'shape';
  shapeId: string;
  pathData?: string;
}

export interface TextElement extends BaseElement, TextStyle {
  kind: 'text';
  text: string;
}

export interface SvgColorPath {
  d: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  lineCap?: StrokeCap;
  lineJoin?: StrokeJoin;
}

export interface IconElement extends BaseElement, TextStyle {
  kind: 'icon';
  iconSymbol: string;
  keepIconScale: boolean;
  iconSource?: 'text' | 'svg' | 'colorSvg';
  svgPaths?: string[];
  svgColorPaths?: SvgColorPath[];
  svgViewBox?: string;
}

export interface CropBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type ImageEffectId =
  | 'natural'
  | 'heroDark'
  | 'softLight'
  | 'glassCard'
  | 'duotoneBlue'
  | 'warmPoster'
  | 'monoClean'
  | 'highContrast'
  | 'cinematic'
  | 'blurBackground';

export interface ImageElement extends BaseElement {
  kind: 'image';
  src: string;
  objectFit: ObjectFit;
  objectPositionX: number;
  objectPositionY: number;
  imageMask: ImageMask;
  brightness: number;
  contrast: number;
  saturation: number;
  sharpness: number;
  grayscale: number;
  sepia: number;
  hueRotate: number;
  invert: number;
  blur: number;
  overlayColor: string;
  overlayOpacity: number;
  crop: CropBox;
  effectPreset?: ImageEffectId;
}

export type UIElement = ShapeElement | TextElement | IconElement | ImageElement;

export interface ShapeDef { id: string; name: string; mark: string; group: 'basic' | 'ui3d'; }
export interface IconDef { id: string; name: string; symbol: string; category: string; }
export interface CanvasPreset { id: string; name: string; w: number; h: number; }
export interface CustomComponent { id: string; name: string; elements: UIElement[]; thumbnail: string; createdAt: string; }
export interface CustomIcon { id: string; name: string; src: string; size: number; radius: number; createdAt: string; }
export interface SampleUi { id: string; name: string; category: string; desc: string; elements: UIElement[]; }
export interface DesignTokens { primary: string; secondary: string; surface: string; background: string; text: string; muted: string; radius: number; spacing: number; }
export interface GuideLine { orientation: 'v' | 'h'; pos: number; start: number; end: number; }
export interface Bounds { x: number; y: number; right: number; bottom: number; w: number; h: number; cx: number; cy: number; }
export interface SelectionBox extends Bounds {}

export interface EditorSnapshot {
  elements: UIElement[];
  selectedIds: string[];
  canvasW: number;
  canvasH: number;
  tokens: DesignTokens;
  customComponents: CustomComponent[];
  customIcons: CustomIcon[];
}

export interface ProjectData {
  version?: number;
  canvas?: { w?: number; h?: number };
  elements?: unknown;
  tokens?: Partial<DesignTokens>;
  customComponents?: CustomComponent[];
  customIcons?: CustomIcon[];
  savedAt?: string;
}

export interface EditorState extends EditorSnapshot {
  panel: Panel;
  zoom: number;
  pan: { x: number; y: number };
  gridVisible: boolean;
  snapEnabled: boolean;
  gridSize: number;
  gridOpacity: number;
  history: EditorSnapshot[];
  future: EditorSnapshot[];
  transientSnapshot: EditorSnapshot | null;
  status: string;
  activeTool: ActiveTool;
  guides: GuideLine[];
  editingTextId: string | null;
  foldedGroups: string[];
  lastShapeId: string;
  lastIconSymbol: string;
  lastIconName: string;
}

export type EditorAction =
  | { type: 'SET_PANEL'; panel: Panel }
  | { type: 'SET_STATUS'; status: string }
  | { type: 'SET_ACTIVE_TOOL'; tool: ActiveTool }
  | { type: 'SET_ZOOM'; zoom: number }
  | { type: 'SET_PAN'; pan: { x: number; y: number } }
  | { type: 'SET_GUIDES'; guides: GuideLine[] }
  | { type: 'SET_CANVAS'; w: number; h: number; clamp?: boolean }
  | { type: 'SET_GRID'; patch: Partial<Pick<EditorState, 'gridVisible' | 'snapEnabled' | 'gridSize' | 'gridOpacity'>> }
  | { type: 'SELECT'; ids: string[]; additive?: boolean }
  | { type: 'SET_LAST_ASSET'; lastShapeId?: string; lastIconSymbol?: string; lastIconName?: string }
  | { type: 'SET_EDITING_TEXT'; id: string | null }
  | { type: 'BEGIN_TRANSIENT' }
  | { type: 'COMMIT_TRANSIENT'; status?: string }
  | { type: 'LOAD_PROJECT'; project: ProjectData; status?: string }
  | { type: 'ADD_ELEMENTS'; elements: UIElement[]; select?: boolean }
  | { type: 'UPDATE_ELEMENTS'; ids: string[]; patch: Partial<UIElement>; commit?: boolean; status?: string }
  | { type: 'MOVE_ELEMENTS'; ids: string[]; dx: number; dy: number; commit?: boolean; status?: string }
  | { type: 'REPLACE_ELEMENTS'; elements: UIElement[]; selectedIds?: string[]; status?: string }
  | { type: 'DELETE_SELECTION' }
  | { type: 'GROUP_SELECTION' }
  | { type: 'UNGROUP_SELECTION' }
  | { type: 'DUPLICATE_SELECTION' }
  | { type: 'LAYER_ORDER'; ids: string[]; direction: 'front' | 'back' | 'forward' | 'backward' }
  | { type: 'ADD_CUSTOM_COMPONENT'; component: CustomComponent }
  | { type: 'DELETE_CUSTOM_COMPONENT'; id: string }
  | { type: 'ADD_CUSTOM_ICON'; icon: CustomIcon }
  | { type: 'DELETE_CUSTOM_ICON'; id: string }
  | { type: 'SET_TOKENS'; tokens: DesignTokens }
  | { type: 'TOGGLE_GROUP_FOLD'; groupId: string }
  | { type: 'UNDO' }
  | { type: 'NEW_PROJECT' }
  | { type: 'REDO' };
