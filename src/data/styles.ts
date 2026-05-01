import type { DesignTokens, UIElement } from '../types/editor';

export interface StylePreset { id: string; name: string; patch: Partial<UIElement>; }
export const stylePresets: StylePreset[] = [
  { id: 'primary', name: 'Primary', patch: { fill: '#2563EB', stroke: '#60A5FA', textColor: '#FFFFFF', radius: 18, shadow: { enabled: true, x: 0, y: 12, blur: 24, spread: 0, color: '#000000', opacity: 0.28 } } },
  { id: 'secondary', name: 'Secondary', patch: { fill: '#7C3AED', stroke: '#A78BFA', textColor: '#FFFFFF', radius: 18 } },
  { id: 'danger', name: 'Danger', patch: { fill: '#DC2626', stroke: '#FCA5A5', textColor: '#FFFFFF', radius: 18 } },
  { id: 'glass', name: 'Glass', patch: { fill: 'rgba(255,255,255,.12)', stroke: 'rgba(255,255,255,.25)', textColor: '#FFFFFF', radius: 28, shadow: { enabled: true, x: 0, y: 18, blur: 36, spread: 0, color: '#000000', opacity: 0.26 } } },
  { id: 'dark', name: 'Dark Card', patch: { fill: '#111827', stroke: '#334155', textColor: '#F8FAFC', radius: 26 } },
  { id: 'soft', name: 'Soft Card', patch: { fill: '#F8FAFC', stroke: '#CBD5E1', textColor: '#0F172A', radius: 24, shadow: { enabled: true, x: 0, y: 10, blur: 24, spread: 0, color: '#0F172A', opacity: 0.16 } } },
  { id: 'outline', name: 'Outline', patch: { fill: 'transparent', stroke: '#94A3B8', strokeWidth: 2, textColor: '#E2E8F0', radius: 16 } },
  { id: 'badge', name: 'Badge', patch: { fill: '#10B981', stroke: 'transparent', textColor: '#FFFFFF', radius: 999, fontSize: 16, fontWeight: 800 } },
];

export function tokensToCss(tokens: DesignTokens) {
  return `:root {\n  --uigs-primary: ${tokens.primary};\n  --uigs-secondary: ${tokens.secondary};\n  --uigs-surface: ${tokens.surface};\n  --uigs-background: ${tokens.background};\n  --uigs-text: ${tokens.text};\n  --uigs-muted: ${tokens.muted};\n  --uigs-radius: ${tokens.radius}px;\n  --uigs-spacing: ${tokens.spacing}px;\n}`;
}
