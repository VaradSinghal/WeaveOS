"use client";

import { RecommendationItem } from "@/lib/api";
import { Zap, CalendarX2, AlertOctagon, Eye } from "lucide-react";

const iconMap: Record<string, typeof Zap> = {
  INCREASE_LOOMS: Zap,
  RESCHEDULE: CalendarX2,
  ESCALATE: AlertOctagon,
  MONITOR: Eye,
};

interface RecommendationChipProps {
  rec: RecommendationItem;
  compact?: boolean;
}

export default function RecommendationChip({ rec, compact }: RecommendationChipProps) {
  const Icon = iconMap[rec.code] ?? Zap;
  const cls = rec.priority === "high" ? "rec-chip rec-chip-high" : "rec-chip rec-chip-medium";

  const label = compact
    ? rec.code.replace(/_/g, " ")
    : rec.text.length > 55
    ? rec.text.slice(0, 52) + "…"
    : rec.text;

  return (
    <span className={cls} title={rec.text}>
      <Icon size={10} />
      {label}
    </span>
  );
}
