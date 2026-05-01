import type { ImageEffectId, ImageElement } from '../types/editor';

export interface ImageEffectPreset {
  id: ImageEffectId;
  name: string;
  desc: string;
  patch: Partial<ImageElement>;
}

export const imageEffectPresets: ImageEffectPreset[] = [
  { id: 'natural', name: 'Natural', desc: '원본에 가까운 기본값', patch: { brightness: 100, contrast: 100, saturation: 100, sharpness: 100, grayscale: 0, sepia: 0, hueRotate: 0, invert: 0, blur: 0, overlayOpacity: 0, effectPreset: 'natural' } },
  { id: 'heroDark', name: 'Hero Dark', desc: '배너 위 텍스트용 어두운 오버레이', patch: { brightness: 82, contrast: 112, saturation: 95, overlayColor: '#020617', overlayOpacity: 0.42, effectPreset: 'heroDark' } },
  { id: 'softLight', name: 'Soft Light', desc: '밝고 부드러운 카드 이미지', patch: { brightness: 116, contrast: 92, saturation: 105, overlayColor: '#FFFFFF', overlayOpacity: 0.10, effectPreset: 'softLight' } },
  { id: 'glassCard', name: 'Glass Card', desc: '유리 패널 배경용 흐림 효과', patch: { brightness: 92, contrast: 102, saturation: 120, blur: 2, overlayColor: '#0F172A', overlayOpacity: 0.18, effectPreset: 'glassCard' } },
  { id: 'duotoneBlue', name: 'Duotone Blue', desc: '파란 톤 UI 배경', patch: { brightness: 96, contrast: 120, saturation: 55, hueRotate: -18, overlayColor: '#1D4ED8', overlayOpacity: 0.28, effectPreset: 'duotoneBlue' } },
  { id: 'warmPoster', name: 'Warm Poster', desc: '따뜻한 프로모션 이미지', patch: { brightness: 108, contrast: 108, saturation: 132, sepia: 18, overlayColor: '#F97316', overlayOpacity: 0.10, effectPreset: 'warmPoster' } },
  { id: 'monoClean', name: 'Mono Clean', desc: '모노톤 와이어프레임 배경', patch: { brightness: 102, contrast: 108, saturation: 0, grayscale: 100, overlayOpacity: 0, effectPreset: 'monoClean' } },
  { id: 'highContrast', name: 'High Contrast', desc: '선명한 썸네일', patch: { brightness: 104, contrast: 145, saturation: 126, sharpness: 140, overlayOpacity: 0, effectPreset: 'highContrast' } },
  { id: 'cinematic', name: 'Cinematic', desc: '어두운 영화 톤', patch: { brightness: 76, contrast: 130, saturation: 92, overlayColor: '#111827', overlayOpacity: 0.22, effectPreset: 'cinematic' } },
  { id: 'blurBackground', name: 'Blur BG', desc: '블러 배경용', patch: { brightness: 90, contrast: 100, saturation: 115, blur: 6, overlayColor: '#020617', overlayOpacity: 0.32, effectPreset: 'blurBackground' } },
];
