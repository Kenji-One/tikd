/* ------------------------------------------------------------------ */
/*  src/components/dashboard/charts/Sparkline.tsx                     */
/*  Figma-accurate dark chart: axes, grid, glow, area, optional tip   */
/* ------------------------------------------------------------------ */
"use client";

type YTick = number | { value: number; label: string };
type Tooltip =
  | {
      /** Index in data to mark/label */
      index: number;
      /** Big label (e.g. "$240,8K") */
      valueLabel: string;
      /** Optional sublabel (e.g. "June 21, 2025") */
      subLabel?: string;
      /** Optional delta pill shown inside tooltip */
      deltaText?: string;
      /** If true -> green, else -> red */
      deltaPositive?: boolean;
    }
  | undefined;

type Props = {
  data: number[];
  /** SVG viewbox height (responsive width) */
  height?: number;
  /** Data stroke width */
  strokeWidth?: number;
  /** Unique id prefix for gradients/filters */
  gradientId?: string;
  /** Stroke color for the line */
  stroke?: string;
  /** Area gradient color (top); bottom fades to 0 */
  fillColor?: string;
  /** Y ticks to render on the left */
  yTicks?: YTick[];
  /** X labels to render at bottom (spaced evenly across domain) */
  xLabels?: string[];
  /** Override Y domain max (defaults to max(data)) */
  yMax?: number;
  /** Override Y domain min (defaults to min(data)) */
  yMin?: number;
  /** Optional tooltip callout with marker dot */
  tooltip?: Tooltip;
};

export default function Sparkline({
  data,
  height = 240,
  strokeWidth = 2.5,
  gradientId = "spark",
  stroke = "#9A46FF",
  fillColor = "#9A46FF",
  yTicks,
  xLabels,
  yMax,
  yMin,
  tooltip,
}: Props) {
  const w = 640; // viewBox width; scales to container
  const h = height;

  // Chart paddings to make room for axes/labels (tuned for the Figma look)
  const PAD_LEFT = yTicks && yTicks.length ? 48 : 16;
  const PAD_RIGHT = 12;
  const PAD_TOP = 10;
  const PAD_BOTTOM = xLabels && xLabels.length ? 28 : 12;

  const innerW = w - PAD_LEFT - PAD_RIGHT;
  const innerH = h - PAD_TOP - PAD_BOTTOM;

  const dMax = yMax ?? Math.max(...data, 1);
  const dMin = yMin ?? Math.min(...data, 0);
  const range = Math.max(1, dMax - dMin);

  const x = (i: number) =>
    PAD_LEFT + (i / Math.max(1, data.length - 1)) * innerW;

  const y = (v: number) => PAD_TOP + innerH - ((v - dMin) / range) * innerH;

  const points = data.map((v, i) => `${x(i).toFixed(2)},${y(v).toFixed(2)}`);
  const areaPath = `M${PAD_LEFT},${PAD_TOP + innerH} L${points.join(" ")} L${
    PAD_LEFT + innerW
  },${PAD_TOP + innerH} Z`;

  const tip = tooltip && data[tooltip.index] != null ? tooltip : undefined;

  // Tooltip geometry (if provided)
  const marker = tip ? { cx: x(tip.index), cy: y(data[tip.index]) } : undefined;

  // Y ticks default (nice 4–6 ticks)
  const defaultYTicks = (() => {
    const steps = 6;
    const step = range / (steps - 1);
    return Array.from({ length: steps }, (_, i) => Math.round(dMin + i * step));
  })();

  const resolvedYTicks: { value: number; label: string }[] = (
    yTicks?.length ? yTicks : defaultYTicks
  ).map((t) =>
    typeof t === "number" ? { value: t, label: formatTick(t) } : t
  );

  function formatTick(v: number) {
    // 250000 -> "250K", 0 -> "0"
    if (Math.abs(v) >= 1000) return `${Math.round(v / 1000)}K`;
    return `${v}`;
  }

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" aria-hidden="true">
      <defs>
        <linearGradient id={`${gradientId}-fill`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={fillColor} stopOpacity={0.25} />
          <stop offset="100%" stopColor={fillColor} stopOpacity={0} />
        </linearGradient>

        {/* Glow for the line (subtle like the Figma) */}
        <filter
          id={`${gradientId}-glow`}
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
        >
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* inner plot area border baseline (optional) */}
      {/* Grid (horizontal only, faint) */}
      <g stroke="rgba(255,255,255,0.06)" strokeWidth={1}>
        {resolvedYTicks.map((t, i) => {
          const yy = y(t.value);
          return (
            <line
              key={`grid-${i}`}
              x1={PAD_LEFT}
              x2={PAD_LEFT + innerW}
              y1={yy}
              y2={yy}
            />
          );
        })}
      </g>

      {/* Area under the line */}
      <path d={areaPath} fill={`url(#${gradientId}-fill)`} />

      {/* Data line with glow */}
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        filter={`url(#${gradientId}-glow)`}
      />

      {/* Marker + Tooltip (for the big revenue chart) */}
      {marker && tip && (
        <>
          {/* marker dot */}
          <circle
            cx={marker.cx}
            cy={marker.cy}
            r={4.5}
            fill="#fff"
            stroke={stroke}
            strokeWidth={2}
          />
          {/* small pointer under tooltip */}
          <path
            d={`M ${marker.cx - 6} ${marker.cy - 12} L ${marker.cx} ${
              marker.cy - 6
            } L ${marker.cx + 6} ${marker.cy - 12} Z`}
            fill="#4C1D95"
            opacity="0.9"
          />
          {/* tooltip bubble */}
          <g transform={`translate(${marker.cx - 80}, ${marker.cy - 58})`}>
            <rect
              width="160"
              height="46"
              rx="10"
              fill="#4C1D95"
              opacity="0.9"
              stroke="rgba(255,255,255,0.08)"
            />
            <text x="14" y="22" fontSize="14" fontWeight="800" fill="#FFFFFF">
              {tip.valueLabel}
            </text>
            {tip.deltaText && (
              <g transform="translate(110,9)">
                <rect
                  width="40"
                  height="18"
                  rx="6"
                  fill={
                    tip.deltaPositive
                      ? "rgba(34,197,94,0.15)"
                      : "rgba(239,68,68,0.15)"
                  }
                  stroke="rgba(255,255,255,0.08)"
                />
                <text
                  x="20"
                  y="13"
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill={tip.deltaPositive ? "#22C55E" : "#EF4444"}
                >
                  {tip.deltaText}
                </text>
              </g>
            )}
            {tip.subLabel && (
              <text
                x="14"
                y="38"
                fontSize="12"
                fontWeight="600"
                fill="rgba(255,255,255,0.9)"
              >
                {tip.subLabel}
              </text>
            )}
          </g>
        </>
      )}

      {/* Axes */}
      {/* Y axis labels at left */}
      <g fontSize="11" fill="#8C8CA6">
        {resolvedYTicks.map((t, i) => (
          <text
            key={`yt-${i}`}
            x={PAD_LEFT - 12}
            y={y(t.value) + 4}
            textAnchor="end"
          >
            {t.label}
          </text>
        ))}
      </g>

      {/* X labels at bottom, evenly spaced */}
      {xLabels && xLabels.length > 0 && (
        <g fontSize="11" fill="#8C8CA6">
          {xLabels.map((lab, i) => (
            <text
              key={`xl-${i}`}
              x={PAD_LEFT + (i / Math.max(1, xLabels.length - 1)) * innerW}
              y={PAD_TOP + innerH + 18}
              textAnchor={
                i === 0 ? "start" : i === xLabels.length - 1 ? "end" : "middle"
              }
            >
              {lab}
            </text>
          ))}
        </g>
      )}
    </svg>
  );
}
