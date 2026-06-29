"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface CategoryTotal {
  categoryId: number | null;
  categoryName: string | null;
  total: string;
}

const COLORS = ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#0891b2"];

export default function ReportsPage() {
  const [categoryTotals, setCategoryTotals] = useState<CategoryTotal[]>([]);

  useEffect(() => {
    fetch("/api/reports/category-totals").then((r) => r.json()).then(setCategoryTotals);
  }, []);

  const chartData = categoryTotals.map((c) => ({
    name: c.categoryName ?? "Sem categoria",
    value: Math.abs(Number(c.total)),
  }));

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Gastos por categoria</h1>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={chartData} dataKey="value" nameKey="name" outerRadius={100} label>
            {chartData.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
