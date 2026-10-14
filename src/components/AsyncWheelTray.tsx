import { lazy, Suspense } from 'react';
import type { WheelSpec } from './ThreeWheelTray';

const ThreeWheelTray = lazy(() => import('./ThreeWheelTray').then((module) => ({ default: module.ThreeWheelTray })));

interface Props {
  wheels: WheelSpec[];
  rolling?: boolean;
  rollingIds?: string[];
  label: string;
  className?: string;
}

export function AsyncWheelTray(props: Props) {
  return <Suspense fallback={<div className={`three-wheel-stage three-wheel-loading ${props.className ?? ''}`} role="status">木轮正在显形…</div>}><ThreeWheelTray {...props} /></Suspense>;
}
