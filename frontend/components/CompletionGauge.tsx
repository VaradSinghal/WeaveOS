"use client";

interface CompletionGaugeProps {
  pct: number;
  size?: number;
  color?: string;
  label?: string;
}

export default function CompletionGauge({
  pct,
  size = 100,
  color = "var(--blue)",
  label,
}: CompletionGaugeProps) {
  const radius = (size - 14) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(pct, 100) / 100) * circumference;
  const cx = size / 2;
  const cy = size / 2;

  const gaugeColor =
    pct >= 75
      ? "var(--green)"
      : pct >= 45
      ? "var(--ink)"
      : pct >= 25
      ? "var(--amber)"
      : "var(--primary)";

  return (
    <div className="gauge-container" style={{ position: "relative" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="var(--hairline-soft)"
          strokeWidth={10}
        />
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={gaugeColor}
          strokeWidth={10}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: size,
          height: size,
          top: 0,
          left: 0,
        }}
      >
        <span
          style={{
            fontSize: size * 0.18,
            fontWeight: 700,
            color: gaugeColor,
            lineHeight: 1,
          }}
        >
          {Math.round(pct)}%
        </span>
        {label && (
          <span style={{ fontSize: size * 0.1, color: "var(--text-muted)", marginTop: 2 }}>
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
