"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

/**
 * The two charts on the analytics page, in a file of their own so the
 * charting library (about 100 kB) is downloaded alongside the figures it
 * draws rather than before the page can show anything at all.
 */

const chartConfig = {
  connections: {
    label: "Connections",
    color: "hsl(var(--primary))",
  },
  score: {
    label: "Trust Score",
    color: "hsl(var(--primary))",
  },
};

export function ConnectionsChart({ data }: { data: { month: string; connections: number }[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorConnections" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} />
          <YAxis hide allowDecimals={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Area
            type="monotone"
            dataKey="connections"
            stroke="hsl(var(--primary))"
            fillOpacity={1}
            fill="url(#colorConnections)"
            strokeWidth={3}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

export function TrustScoreChart({ score }: { score: number }) {
  // A single bar: the score against the 0–100 scale.
  const data = [{ label: "Your Score", score }];
  return (
    <ChartContainer config={chartConfig} className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} />
          <YAxis domain={[0, 100]} hide />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="score" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} barSize={60} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
