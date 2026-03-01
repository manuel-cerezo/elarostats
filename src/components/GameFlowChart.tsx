import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Label,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useTranslation } from "../hooks/useTranslation";
import { useTheme } from "../context/ThemeContext";

// --- Types ---

export interface ScoreMargin {
  start_time: number;
  end_time: number;
  margin: number;
}

interface ChartPoint {
  time: number;
  margin: number;
}

interface GameFlowChartProps {
  margins: ScoreMargin[];
  maxTime: number;
  homeAbbr: string;
  awayAbbr: string;
}

// --- Helpers ---

const QUARTER_SECONDS = 720;
const OT_SECONDS = 300;

function buildQuarterMarkers(maxTime: number): { time: number; label: string }[] {
  const markers: { time: number; label: string }[] = [];

  // Regular quarters
  for (let q = 1; q <= 4; q++) {
    const t = q * QUARTER_SECONDS;
    if (t <= maxTime) markers.push({ time: t, label: `Q${q}` });
  }

  // Overtime periods
  let ot = 1;
  let otStart = 4 * QUARTER_SECONDS;
  while (otStart + OT_SECONDS <= maxTime + 1) {
    markers.push({ time: otStart + OT_SECONDS, label: `OT${ot}` });
    otStart += OT_SECONDS;
    ot++;
  }

  return markers;
}

function buildChartData(margins: ScoreMargin[]): ChartPoint[] {
  if (margins.length === 0) return [];

  const points: ChartPoint[] = [{ time: 0, margin: 0 }];

  for (const m of margins) {
    // Add start point (transition to this margin)
    points.push({ time: m.start_time, margin: m.margin });
    // Add end point (holds this margin until end_time)
    points.push({ time: m.end_time, margin: m.margin });
  }

  // Deduplicate consecutive points at same time keeping the last margin
  const deduped: ChartPoint[] = [];
  for (let i = 0; i < points.length; i++) {
    if (i < points.length - 1 && points[i].time === points[i + 1].time) {
      continue; // Skip — the next point at same time has the updated margin
    }
    deduped.push(points[i]);
  }

  return deduped;
}

function formatTime(seconds: number, maxTime: number): string {
  if (seconds <= 0) return "Start";
  const markers = buildQuarterMarkers(maxTime);
  for (const m of markers) {
    if (Math.abs(seconds - m.time) < 5) return m.label;
  }
  const quarter = Math.min(Math.ceil(seconds / QUARTER_SECONDS), 4);
  const inQuarter = seconds - (quarter - 1) * QUARTER_SECONDS;
  const minutes = Math.floor(inQuarter / 60);
  return `Q${quarter} ${minutes}'`;
}

// --- Custom tooltip ---

interface TooltipPayloadItem {
  value: number;
  payload: ChartPoint;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  homeAbbr: string;
  awayAbbr: string;
  t: ReturnType<typeof useTranslation>["t"];
}

function CustomTooltip({ active, payload, homeAbbr, awayAbbr, t }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const margin = payload[0].value;
  const label =
    margin === 0
      ? t("gameFlowTied")
      : margin > 0
        ? t("gameFlowHomeLeads").replace("{team}", homeAbbr)
        : t("gameFlowAwayLeads").replace("{team}", awayAbbr);

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg dark:border-gray-700 dark:bg-gray-900">
      <p className="text-xs font-medium text-gray-600 dark:text-gray-300">{label}</p>
      <p className="text-sm font-bold text-gray-900 dark:text-white">
        {margin > 0 ? "+" : ""}
        {margin}
      </p>
    </div>
  );
}

// --- Main component ---

export default function GameFlowChart({
  margins,
  maxTime,
  homeAbbr,
  awayAbbr,
}: GameFlowChartProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const data = buildChartData(margins);
  const quarterMarkers = buildQuarterMarkers(maxTime);

  if (data.length < 2) return null;

  // Compute symmetric Y domain so the zero line is centered
  const absMax = Math.max(...data.map((d) => Math.abs(d.margin)), 4);
  const yDomain = [-(absMax + 2), absMax + 2];

  // Compute gradient split offset (0 = top of chart, 1 = bottom)
  // The zero line position as a fraction from top
  const gradientOffset = (absMax + 2) / (2 * (absMax + 2));

  // Theme-aware colors
  const tickColor = isDark ? "#6b7280" : "#9ca3af";
  const axisLineColor = isDark ? "#374151" : "#d1d5db";
  const refLineColor = isDark ? "#6b7280" : "#9ca3af";
  const quarterLineColor = isDark ? "#374151" : "#e5e7eb";
  const cursorColor = isDark ? "#9ca3af" : "#6b7280";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/60">
      <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
        {t("gameFlow")}
      </p>

      {/* Legend */}
      <div className="mb-2 flex items-center justify-center gap-6 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-orange-400/70" />
          {homeAbbr}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-blue-400/70" />
          {awayAbbr}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <defs>
            <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
              <stop offset={0} stopColor="#fb923c" stopOpacity={isDark ? 0.5 : 0.3} />
              <stop offset={gradientOffset} stopColor="#fb923c" stopOpacity={0.08} />
              <stop offset={gradientOffset} stopColor="#60a5fa" stopOpacity={0.08} />
              <stop offset={1} stopColor="#60a5fa" stopOpacity={isDark ? 0.5 : 0.3} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="time"
            type="number"
            domain={[0, maxTime]}
            ticks={quarterMarkers.map((m) => m.time)}
            tickFormatter={(v: number) => {
              const marker = quarterMarkers.find((m) => m.time === v);
              return marker?.label ?? "";
            }}
            tick={{ fontSize: 11, fill: tickColor }}
            axisLine={{ stroke: axisLineColor }}
            tickLine={false}
          />

          <YAxis
            domain={yDomain}
            tick={{ fontSize: 10, fill: tickColor }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => (v === 0 ? "0" : v > 0 ? `+${v}` : `${v}`)}
          >
            <Label
              value={homeAbbr}
              position="insideTopLeft"
              offset={8}
              style={{ fontSize: 11, fontWeight: 700, fill: "#fb923c" }}
            />
            <Label
              value={awayAbbr}
              position="insideBottomLeft"
              offset={8}
              style={{ fontSize: 11, fontWeight: 700, fill: "#60a5fa" }}
            />
          </YAxis>

          {/* Zero (tie) line */}
          <ReferenceLine y={0} stroke={refLineColor} strokeDasharray="3 3" strokeWidth={1} />

          {/* Quarter boundary lines */}
          {quarterMarkers.slice(0, -1).map((m) => (
            <ReferenceLine
              key={m.time}
              x={m.time}
              stroke={quarterLineColor}
              strokeDasharray="2 4"
              strokeWidth={1}
            />
          ))}

          <Tooltip
            content={
              <CustomTooltip homeAbbr={homeAbbr} awayAbbr={awayAbbr} t={t} />
            }
            cursor={{ stroke: cursorColor, strokeWidth: 1 }}
          />

          <Area
            type="stepAfter"
            dataKey="margin"
            stroke="#fb923c"
            strokeWidth={1.5}
            fill="url(#splitColor)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
