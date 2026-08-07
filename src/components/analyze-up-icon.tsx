import React from "react";
import { cn } from "@/lib/utils";

interface AnalyzeUpIconProps {
  className?: string;
  style?: React.CSSProperties;
  healthColor?: string;
}

export const AnalyzeUpIcon: React.FC<AnalyzeUpIconProps> = ({ className, style, healthColor }) => {
  const customStyle: React.CSSProperties = {
    color: healthColor || undefined,
    ...style,
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-6 w-6 transition-colors duration-500 shrink-0", className)}
      style={customStyle}
      stroke="currentColor"
    >
      <path
        d="M3 20L8.5 12L13 16L21 4"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 4H21V10"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
