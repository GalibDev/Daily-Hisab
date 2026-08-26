"use client";

import { useId, useMemo, useRef, useState, type TouchEvent } from "react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type CategoryData = {
  name: string;
  value: number;
  fill: string;
};

type TrendData = {
  day: number;
  expense: number;
};

export function CategoryPieChart({ data = [] }: Readonly<{ data?: CategoryData[] }>) {
  if (data.length === 0) {
    return <div className="grid h-[230px] place-items-center rounded-xl border border-dashed border-[#d8d1ff] text-sm text-[#746d86]">No chart data yet.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={230}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={1} isAnimationActive={false}>
          {data.map((item) => (
            <Cell key={item.name} fill={item.fill} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => `৳ ${value}`} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ExpenseTrendChart({ data = [], monthLabel, height = 280 }: Readonly<{ data?: TrendData[]; monthLabel?: string; height?: number }>) {
  const chartId = useId().replaceAll(":", "");
  const fillId = `expenseTrendFill-${chartId}`;
  const strokeId = `expenseTrendStroke-${chartId}`;
  const glowId = `expensePeakGlow-${chartId}`;
  const [viewport, setViewport] = useState({ start: 0, end: Math.max(data.length - 1, 0) });
  const pinchRef = useRef<{
    distance: number;
    midpointX: number;
    range: number;
    centerIndex: number;
    width: number;
  } | null>(null);
  const visibleData = useMemo(() => {
    const lastIndex = Math.max(data.length - 1, 0);
    const start = Math.min(viewport.start, lastIndex);
    const end = Math.max(start, Math.min(viewport.end, lastIndex));
    return data.slice(start, end + 1);
  }, [data, viewport]);
  const isZoomed = visibleData.length < data.length;

  function touchDistance(event: TouchEvent<HTMLDivElement>) {
    const [first, second] = [event.touches[0], event.touches[1]];
    return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
  }

  function touchMidpointX(event: TouchEvent<HTMLDivElement>) {
    return (event.touches[0].clientX + event.touches[1].clientX) / 2;
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    if (event.touches.length !== 2 || data.length < 2) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const midpointX = touchMidpointX(event);
    const range = Math.max(viewport.end - viewport.start + 1, 1);
    const midpointRatio = Math.min(Math.max((midpointX - bounds.left) / Math.max(bounds.width, 1), 0), 1);

    pinchRef.current = {
      distance: Math.max(touchDistance(event), 1),
      midpointX,
      range,
      centerIndex: viewport.start + midpointRatio * Math.max(range - 1, 0),
      width: Math.max(bounds.width, 1),
    };
  }

  function handleTouchMove(event: TouchEvent<HTMLDivElement>) {
    const pinch = pinchRef.current;
    if (!pinch || event.touches.length !== 2 || data.length < 2) return;
    event.preventDefault();

    const scale = touchDistance(event) / pinch.distance;
    const nextRange = Math.min(data.length, Math.max(5, Math.round(pinch.range / Math.max(scale, 0.2))));
    const translatedPoints = ((touchMidpointX(event) - pinch.midpointX) / pinch.width) * pinch.range;
    const nextCenter = pinch.centerIndex - translatedPoints;
    const maximumStart = Math.max(data.length - nextRange, 0);
    const nextStart = Math.min(maximumStart, Math.max(0, Math.round(nextCenter - (nextRange - 1) / 2)));

    setViewport({ start: nextStart, end: nextStart + nextRange - 1 });
  }

  function finishTouch() {
    pinchRef.current = null;
  }

  function resetZoom() {
    setViewport({ start: 0, end: Math.max(data.length - 1, 0) });
  }

  if (data.every((item) => item.expense === 0)) {
    return <div className="grid place-items-center rounded-xl border border-dashed border-[#d8d1ff] text-sm text-[#746d86]" style={{ height }}>No trend data yet.</div>;
  }

  return (
    <div
      className="relative select-none"
      style={{ touchAction: "pan-y" }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={finishTouch}
      onTouchCancel={finishTouch}
      aria-label="Expense trend chart. Use two fingers to pinch and drag the graph."
    >
      <div className="absolute right-1 top-1 z-10 flex items-center gap-2">
        <span className="rounded-full bg-white/90 px-2 py-1 text-[10px] font-bold text-[#72798d] shadow-sm">Pinch with 2 fingers</span>
        {isZoomed && <button type="button" onClick={resetZoom} className="rounded-full bg-[#11298f] px-2.5 py-1 text-[10px] font-extrabold text-white shadow-sm">Reset</button>}
      </div>
      <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={visibleData} margin={{ top: 58, right: 12, left: 4, bottom: 4 }}>
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16a879" stopOpacity={0.52} />
            <stop offset="58%" stopColor="#4bc49b" stopOpacity={0.20} />
            <stop offset="100%" stopColor="#8be0c1" stopOpacity={0.03} />
          </linearGradient>
          <linearGradient id={strokeId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#076f50" />
            <stop offset="62%" stopColor="#0b9469" />
            <stop offset="100%" stopColor="#42b88f" />
          </linearGradient>
          <filter id={glowId} x="-150%" y="-150%" width="400%" height="400%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <CartesianGrid vertical={false} stroke="#e8ebf3" strokeDasharray="0" />
        <XAxis dataKey="day" ticks={[1, 10, 15, 25, 30]} tickFormatter={(day) => monthLabel ? `${day} ${monthLabel}` : `${day}`} tickLine={false} axisLine={false} tick={{ fill: "#72798d", fontSize: 11 }} dy={8} />
        <YAxis width={58} tickLine={false} axisLine={false} tick={{ fill: "#72798d", fontSize: 11 }} tickFormatter={(value) => `৳ ${Math.round(Number(value))}`} />
        <Tooltip
          cursor={{ stroke: "#7d86df", strokeWidth: 1, strokeDasharray: "4 4" }}
          formatter={(value) => [`৳ ${Number(value).toLocaleString("en-US")}`, "Amount"]}
          labelFormatter={(day) => `Day ${day}`}
          contentStyle={{ background: "#172238", border: 0, borderRadius: 14, boxShadow: "0 14px 32px rgba(15,23,42,.24)", color: "#fff", padding: "10px 14px" }}
          labelStyle={{ color: "#b9c2d5", fontSize: 11 }}
          itemStyle={{ color: "#fff", fontWeight: 800 }}
        />
        <Area type="monotone" dataKey="expense" stroke={`url(#${strokeId})`} strokeWidth={3} fill={`url(#${fillId})`} activeDot={{ r: 6, fill: "#087d5a", stroke: "#c9f3e3", strokeWidth: 4 }} isAnimationActive animationDuration={850} />
        {(() => {
          const peak = visibleData.reduce((best, item) => item.expense > best.expense ? item : best, visibleData[0]);
          return peak?.expense > 0 ? (
            <ReferenceDot
              x={peak.day}
              y={peak.expense}
              r={7}
              fill="#087d5a"
              stroke="#c9f3e3"
              strokeWidth={5}
              filter={`url(#${glowId})`}
              label={{
                value: `৳ ${peak.expense.toLocaleString("en-US")}`,
                position: "top",
                offset: 18,
                fill: "#172238",
                fontSize: 13,
                fontWeight: 800,
              }}
            />
          ) : null;
        })()}
      </AreaChart>
      </ResponsiveContainer>
      <span className="sr-only" aria-live="polite">{isZoomed ? `Showing days ${visibleData[0]?.day} to ${visibleData.at(-1)?.day}` : "Showing the full expense trend"}</span>
    </div>
  );
}
