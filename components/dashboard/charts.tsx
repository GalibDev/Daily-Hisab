"use client";

import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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

export function ExpenseTrendChart({ data = [] }: Readonly<{ data?: TrendData[] }>) {
  if (data.every((item) => item.expense === 0)) {
    return <div className="grid h-[250px] place-items-center rounded-xl border border-dashed border-[#d8d1ff] text-sm text-[#746d86]">No trend data yet.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
        <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis tickLine={false} axisLine={false} fontSize={11} />
        <Tooltip formatter={(value) => `৳ ${value}`} cursor={{ fill: "#f4f1ff" }} />
        <Bar dataKey="expense" fill="#6C4CF1" radius={[6, 6, 0, 0]} barSize={8} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
