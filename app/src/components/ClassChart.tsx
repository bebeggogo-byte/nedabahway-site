"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface ClassDatum {
  name: string;
  consentPct: number;
  studentCount: number;
}

export function ClassChart({ data }: { data: ClassDatum[] }) {
  return (
    <div style={{ width: "100%", height: 320, marginTop: 16 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
          <XAxis dataKey="name" stroke="var(--color-ink-soft)" fontSize={12} />
          <YAxis
            stroke="var(--color-ink-soft)"
            fontSize={12}
            domain={[0, 100]}
            label={{
              value: "동의율 (%)",
              angle: -90,
              position: "insideLeft",
              fill: "var(--color-ink-soft)",
              fontSize: 12,
            }}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid var(--color-line-strong)",
              background: "var(--color-paper)",
            }}
          />
          <Bar dataKey="consentPct" fill="var(--color-green-deep)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
