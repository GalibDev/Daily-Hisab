"use client";

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

export function ExpenseTrendChart({ data = [], monthLabel }: Readonly<{ data?: TrendData[]; monthLabel?: string }>) {
  if (data.every((item) => item.expense === 0)) {
    return <div className="grid h-[250px] place-items-center rounded-xl border border-dashed border-[#d8d1ff] text-sm text-[#746d86]">No trend data yet.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 58, right: 12, left: 4, bottom: 4 }}>
        <defs>
          <linearGradient id="expenseTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16a879" stopOpacity={0.52} />
            <stop offset="58%" stopColor="#4bc49b" stopOpacity={0.20} />
            <stop offset="100%" stopColor="#8be0c1" stopOpacity={0.03} />
          </linearGradient>
          <linearGradient id="expenseTrendStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#076f50" />
            <stop offset="62%" stopColor="#0b9469" />
            <stop offset="100%" stopColor="#42b88f" />
          </linearGradient>
          <filter id="expensePeakGlow" x="-150%" y="-150%" width="400%" height="400%">
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
        <Area type="monotone" dataKey="expense" stroke="url(#expenseTrendStroke)" strokeWidth={3} fill="url(#expenseTrendFill)" activeDot={{ r: 6, fill: "#087d5a", stroke: "#c9f3e3", strokeWidth: 4 }} isAnimationActive animationDuration={850} />
        {(() => {
          const peak = data.reduce((best, item) => item.expense > best.expense ? item : best, data[0]);
          return peak?.expense > 0 ? (
            <ReferenceDot
              x={peak.day}
              y={peak.expense}
              r={7}
              fill="#087d5a"
              stroke="#c9f3e3"
              strokeWidth={5}
              filter="url(#expensePeakGlow)"
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
  );
}
