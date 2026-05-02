"use client";

import { CircleCheck, AlertTriangle, XCircle } from "lucide-react";

type RiskStatus = "On Track" | "At Risk" | "High Risk";

interface RiskBadgeProps {
  status: RiskStatus;
  size?: "sm" | "md";
}

const config: Record<RiskStatus, { cls: string; Icon: typeof CircleCheck }> = {
  "On Track": { cls: "risk-on-track", Icon: CircleCheck },
  "At Risk": { cls: "risk-at-risk", Icon: AlertTriangle },
  "High Risk": { cls: "risk-high-risk", Icon: XCircle },
};

export default function RiskBadge({ status, size = "md" }: RiskBadgeProps) {
  const { cls, Icon } = config[status] ?? config["On Track"];
  const iconSize = size === "sm" ? 11 : 13;
  return (
    <span className={`risk-badge ${cls}`}>
      <Icon size={iconSize} />
      {status}
    </span>
  );
}
