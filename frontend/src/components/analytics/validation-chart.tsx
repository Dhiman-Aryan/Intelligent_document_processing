"use client";

import { DOCUMENT_TYPE_META, type DocumentType } from "@/lib/types";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function ValidationChart({
  data,
}: {
  data: { type: DocumentType; pass: number; failed: number }[];
}) {
  const chartData = data.map((d) => ({
    name: DOCUMENT_TYPE_META[d.type].shortLabel,
    Pass: d.pass,
    Failed: d.failed,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} barCategoryGap="25%">
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
        />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} width={24} />
        <Tooltip
          cursor={{ fill: "var(--color-muted)" }}
          contentStyle={{
            borderRadius: 12,
            border: "1px solid var(--color-border)",
            background: "var(--color-card)",
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Pass" stackId="a" fill="var(--color-success)" radius={[0, 0, 0, 0]} maxBarSize={28} />
        <Bar dataKey="Failed" stackId="a" fill="var(--color-danger)" radius={[6, 6, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
