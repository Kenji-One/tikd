/* ------------------------------------------------------------------ */
/*  src/components/dashboard/charts/Donut.tsx                         */
/* ------------------------------------------------------------------ */
"use client";

type Segment = { value: number; label: string; color: string };

export default function Donut({
  segments,
  size = 160,
  thickness = 16,
}: {
  segments: Segment[];
  size?: number;
  thickness?: number;
}) {
  const total = segments.reduce((a, b) => a + b.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = size / 2;
  let offset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {segments.map((s, i) => {
        const frac = s.value / total;
        const sweep = frac * 2 * Math.PI * r;
        const dashArray = `${sweep} ${2 * Math.PI * r - sweep}`;
        const el = (
          <circle
            key={s.label + i}
            r={r}
            cx={c}
            cy={c}
            fill="transparent"
            stroke={s.color}
            strokeWidth={thickness}
            strokeDasharray={dashArray}
            strokeDashoffset={-offset}
            strokeLinecap="round"
            opacity={0.95}
          />
        );
        offset += sweep;
        return el;
      })}
      {/* center label */}
      <circle cx={c} cy={c} r={r - thickness / 1.5} fill="#0E0F13" />
    </svg>
  );
}
