import type { CustomComponent, UIElement } from '../types/editor';
import { makeIcon, makeShape, makeText, uid } from '../utils/elements';

function component(id: string, name: string, elements: UIElement[]): CustomComponent {
  return { id, name, elements, thumbnail: '', createdAt: 'builtin' };
}

function cardBlock() {
  const card = makeShape('uiShadowCard'); Object.assign(card, { id: 'preset-card-bg', name: 'Card', x: 0, y: 0, w: 280, h: 180, fill: '#111827', radius: 28 });
  const dot = makeIcon('●', 'Dot'); Object.assign(dot, { id: 'preset-card-dot', x: 24, y: 24, w: 38, h: 38, textColor: '#60A5FA' });
  const line = makeShape('roundRect'); Object.assign(line, { id: 'preset-card-line', name: 'Text Line', x: 78, y: 28, w: 160, h: 18, fill: '#334155', stroke: 'transparent', radius: 9 });
  const button = makeShape('uiGlossButton'); Object.assign(button, { id: 'preset-card-button', name: 'Primary Button', x: 24, y: 116, w: 150, h: 42, text: 'Action', fill: '#2563EB' });
  return component('builtin-card-block', 'Card Block', [card, dot, line, button]);
}

function searchInput() {
  const input = makeShape('uiInput'); Object.assign(input, { id: 'preset-search-input', name: 'Search Input', x: 0, y: 0, w: 320, h: 54, text: 'Search...', fill: '#0F172A', stroke: '#334155' });
  return component('builtin-search-input', 'Search Input', [input]);
}

function navigationBar() {
  const nav = makeShape('uiRaisedBar'); Object.assign(nav, { id: 'preset-nav', name: 'Navigation Bar', x: 0, y: 0, w: 640, h: 70, text: 'Logo        Home   Product   Contact', fill: '#111827' });
  return component('builtin-navigation-bar', 'Navigation Bar', [nav]);
}

function primaryButton() {
  const button = makeShape('uiGlossButton'); Object.assign(button, { id: 'preset-primary-button', name: 'Primary Button', x: 0, y: 0, w: 180, h: 52, text: 'Primary Button', fill: '#2563EB', radius: 18 });
  return component('builtin-primary-button', 'Primary Button', [button]);
}

export const builtInComponents: CustomComponent[] = [cardBlock(), searchInput(), navigationBar(), primaryButton()];

export function cloneComponentElements(component: CustomComponent, canvasW: number, canvasH: number, offsetX = 160, offsetY = 120) {
  const gid = component.elements.length > 1 ? `component-${Date.now()}` : undefined;
  return component.elements.map((el) => ({
    ...el,
    id: uid(el.kind),
    name: el.name,
    x: Math.min(Math.max(0, el.x + offsetX), Math.max(0, canvasW - el.w)),
    y: Math.min(Math.max(0, el.y + offsetY), Math.max(0, canvasH - el.h)),
    groupId: gid,
  }));
}
