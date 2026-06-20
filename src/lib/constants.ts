import type { Outcome } from '../types';

export const OUTCOMES: Outcome[] = [
  { label: '$10B', value: 10000000000, color: '#1d4ed8', textColor: '#ffffff', icon: '🏆' },
  { label: 'Loss', value: -1, color: '#0f172a', textColor: '#ef4444', icon: '💀' },
  { label: '$500k', value: 500000, color: '#eff6ff', textColor: '#1e293b', icon: '' },
  { label: '$1M', value: 1000000, color: '#bfdbfe', textColor: '#1e3a8a', icon: '' },
  { label: '$10M', value: 10000000, color: '#dbeafe', textColor: '#1e293b', icon: '' },
  { label: '$100M', value: 100000000, color: '#93c5fd', textColor: '#1e3a8a', icon: '' },
  { label: '-$1B', value: -1000000000, color: '#fee2e2', textColor: '#ef4444', icon: '📉' },
];
