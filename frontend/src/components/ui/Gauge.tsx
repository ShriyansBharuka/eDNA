import { RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";

interface GaugeProps {
  value: number;
  max: number;
  label: string;
  sublabel: string;
  color?: string;
}

export default function Gauge({ value, max, label, sublabel, color = "#38bdf8" }: GaugeProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const data = [{ name: label, value: pct, fill: color }];

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-36 w-36">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius="72%"
            outerRadius="100%"
            data={data}
            startAngle={90}
            endAngle={-270}
            barSize={10}
          >
            <RadialBar dataKey="value" cornerRadius={20} background={{ fill: "rgba(255,255,255,0.08)" }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-display font-semibold text-glow">{value.toFixed(2).replace(/\.00$/, "")}</span>
        </div>
      </div>
      <p className="mt-3 font-medium">{label}</p>
      <p className="text-xs text-slate-400 text-center max-w-[10rem]">{sublabel}</p>
    </div>
  );
}
