import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Deterministic matrix renderer used to present the hosted payment URL /
 * provider payment URI as a scannable-style code in the prototype.
 * In production the provider returns the encoded payment URI and BEYLO renders
 * it with a certified QR library.
 */
const hash = (input: string): number[] => {
  const out: number[] = [];
  let h1 = 0x811c9dc5;
  for (let i = 0; i < 512; i++) {
    const ch = input.charCodeAt(i % Math.max(1, input.length)) + i * 31;
    h1 = (h1 ^ ch) * 16777619;
    h1 >>>= 0;
    out.push(h1 % 100);
  }
  return out;
};

export const QRCode: React.FC<{ value: string; size?: number; className?: string }> = ({
  value,
  size = 200,
  className,
}) => {
  const modules = 29;
  const cells = React.useMemo(() => hash(value || 'beylo'), [value]);

  const isFinder = (r: number, c: number) => {
    const inBox = (r0: number, c0: number) => r >= r0 && r < r0 + 7 && c >= c0 && c < c0 + 7;
    return inBox(0, 0) || inBox(0, modules - 7) || inBox(modules - 7, 0);
  };

  const finderFill = (r: number, c: number) => {
    const local = (r0: number, c0: number) => ({ r: r - r0, c: c - c0 });
    const boxes = [
      [0, 0],
      [0, modules - 7],
      [modules - 7, 0],
    ];
    for (const [r0, c0] of boxes) {
      if (r >= r0 && r < r0 + 7 && c >= c0 && c < c0 + 7) {
        const { r: lr, c: lc } = local(r0, c0);
        const ring = lr === 0 || lr === 6 || lc === 0 || lc === 6;
        const core = lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4;
        return ring || core;
      }
    }
    return false;
  };

  const rects: React.ReactNode[] = [];
  for (let r = 0; r < modules; r++) {
    for (let c = 0; c < modules; c++) {
      let on: boolean;
      if (isFinder(r, c)) on = finderFill(r, c);
      else if (r === 6 || c === 6) on = (r + c) % 2 === 0;
      else on = cells[(r * modules + c) % cells.length] % 100 > 47;
      if (!on) continue;
      rects.push(<rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} rx={0.18} fill="#0B1526" />);
    }
  }

  return (
    <div
      className={cn('inline-flex items-center justify-center rounded-xl border border-line bg-white p-3', className)}
      role="img"
      aria-label={`Payment QR code for ${value}`}
    >
      <svg width={size} height={size} viewBox={`-1 -1 ${modules + 2} ${modules + 2}`} shapeRendering="crispEdges">
        <rect x={-1} y={-1} width={modules + 2} height={modules + 2} fill="#FFFFFF" />
        {rects}
      </svg>
    </div>
  );
};

export default QRCode;
