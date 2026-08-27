'use client';

import { BarChart3, Boxes, DollarSign, ShoppingCart, RefreshCw, TrendingUp } from "lucide-react";
import './animated-hero.css';

const featureFaces = [
  {
    icon: <Boxes size={48} strokeWidth={1.2} />,
    label: "Inventory",
  },
  {
    icon: <TrendingUp size={48} strokeWidth={1.2} />,
    label: "Sales",
  },
  {
    icon: <RefreshCw size={48} strokeWidth={1.2} />,
    label: "Returns",
  },
  {
    icon: <BarChart3 size={48} strokeWidth={1.2} />,
    label: "Reports",
  },
  {
    icon: <ShoppingCart size={48} strokeWidth={1.2} />,
    label: "Orders",
  },
  {
    icon: <DollarSign size={48} strokeWidth={1.2} />,
    label: "Value",
  },
];

export function AnimatedHero() {
  return (
    <div className="scene-container">
      <div className="scene">
        <div className="cube">
          {featureFaces.map((face, index) => (
            <div key={index} className={`cube__face cube__face--${index + 1}`}>
              <div className="flex flex-col items-center justify-center gap-2 text-primary">
                {face.icon}
                <p className="font-bold text-base tracking-wide text-foreground/90">{face.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
