"use client";

import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { categoryExpense, trend } from "@/data/mock-data";

type CategoryData = {
  name: string;
  value: number;
  fill: string;
};

type TrendData = {
  day: number;
  expense: number;
};

export function CategoryPieChart({ data = categoryExpense }: Readonly<{ data?: CategoryData[] }>) {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={1}>
          {data.map((item) => (
            <Cell key={item.name} fill={item.fill} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => `৳ ${value}`} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ExpenseTrendChart({ data = trend }: Readonly<{ data?: TrendData[] }>) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
        <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis tickLine={false} axisLine={false} fontSize={11} />
        <Tooltip formatter={(value) => `৳ ${value}`} cursor={{ fill: "#f4f1ff" }} />
        <Bar dataKey="expense" fill="#6C4CF1" radius={[6, 6, 0, 0]} barSize={8} />
      </BarChart>
    </ResponsiveContainer>
  );
}
