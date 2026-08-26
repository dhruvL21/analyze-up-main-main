"use client";

import { usePathname } from "next/navigation";
import {
  Boxes,
  LayoutDashboard,
  ShoppingCart,
  Truck,
  BarChart3,
  Sparkles,
  Activity,
  RefreshCw,
  Layers,
  TrendingUp,
  Crown,
  CreditCard,
  Users,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { AnalyzeUpIcon } from "./analyze-up-icon";
import { motion } from "framer-motion";
import { SheetClose } from "@/components/ui/sheet";
import { useData } from "@/context/data-context";

const navItems = [
  {
    href: "/dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
  },
  {
    href: "/dashboard/inventory",
    icon: Boxes,
    label: "Operations",
  },
  {
    href: "/dashboard/suppliers",
    icon: Truck,
    label: "Suppliers",
  },
  {
    href: "/dashboard/executive",
    icon: Crown,
    label: "Executive",
  },
  {
    href: "/dashboard/integrations",
    icon: Layers,
    label: "Connect",
  },
  {
    href: "/dashboard/insights",
    icon: BarChart3,
    label: "Insights & Health",
  },
  {
    href: "/dashboard/ai-advisor",
    icon: Sparkles,
    label: "Ask?",
  },
];

import { useMemo } from "react";
import { computeBusinessHealth } from "@/lib/command-center-engine";

export default function Nav({ isMobile = false }: { isMobile?: boolean }) {
  const pathname = usePathname();
  const { products, transactions, suppliers, returns, isLimitExceeded, activePlan, setShowSubscriptionModal } = useData();

  const healthSummary = useMemo(() => {
    return computeBusinessHealth(products, transactions, suppliers, returns);
  }, [products, transactions, suppliers, returns]);

  const healthLogoColor = useMemo(() => {
    return healthSummary.color;
  }, [healthSummary.color]);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    const isPremiumRoute =
      href.startsWith("/dashboard/ai-advisor") ||
      href.startsWith("/dashboard/insights") ||
      href.startsWith("/dashboard/business-health");

    const isLocked = isPremiumRoute && (activePlan !== "Pro Plan" || isLimitExceeded);

    if (isLocked) {
      e.preventDefault();
      setShowSubscriptionModal(true);
    }
  };

  const isItemActive = (itemHref: string, itemLabel: string) => {
    if (itemLabel === 'Operations') {
      return pathname.startsWith('/dashboard/inventory') || pathname.startsWith('/dashboard/orders') || pathname.startsWith('/dashboard/returns');
    }
    return pathname === itemHref;
  };

  if (isMobile) {
    return (
      <nav className="grid gap-2 text-lg font-medium">
        <SheetClose asChild>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xl font-semibold mb-4"
          >
            <AnalyzeUpIcon className="h-6 w-6" healthColor={healthLogoColor} />
            <span>AnalyzeUp</span>
          </Link>
        </SheetClose>
        {navItems.map((item) => {
          const active = isItemActive(item.href, item.label);
          return (
            <SheetClose key={item.href} asChild>
              <Link
                href={item.href}
                data-tour={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={(e) => handleNavClick(e, item.href)}
                className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-foreground/70 transition-all hover:text-primary",
                  active && "text-primary bg-primary/10"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            </SheetClose>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="hidden md:flex items-center gap-0.5 lg:gap-1.5 text-xs lg:text-sm font-semibold whitespace-nowrap">
      {navItems.map((item) => {
        const active = isItemActive(item.href, item.label);
        return (
          <Link
            key={item.href}
            href={item.href}
            data-tour={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            onClick={(e) => handleNavClick(e, item.href)}
            className={cn("transition-all duration-200 hover:text-foreground/80 px-2.5 lg:px-3.5 py-1.5 rounded-full cursor-pointer relative whitespace-nowrap shrink-0 hover:scale-105",
              active ? "text-accent-foreground font-bold" : "text-muted-foreground"
            )}
          >
            {item.label}
            {active && (
              <motion.span
                layoutId="active-nav-link"
                className="absolute inset-0 bg-black/20 dark:bg-white/10 backdrop-blur-sm rounded-full -z-10 border border-border/40 shadow-sm"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
