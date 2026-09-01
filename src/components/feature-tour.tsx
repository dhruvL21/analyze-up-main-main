'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '@/context/data-context';
import { useUser } from '@/firebase';
import {
  LayoutDashboard,
  Boxes,
  Truck,
  Sparkles,
  BarChart3,
  Bot,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle2,
  Crown,
  Layers,
  Bell,
  CreditCard,
  Compass,
} from 'lucide-react';
import { Button } from './ui/button';
import { AnalyzeUpIcon } from './analyze-up-icon';

export interface TourStep {
  id: string;
  selector: string;
  title: string;
  category: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  preferredPlacement?: 'bottom' | 'top' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'header-logo',
    selector: '[data-tour="header-logo"]',
    title: 'AnalyzeUp Intelligence Platform',
    category: 'Welcome Overview',
    description: 'Welcome to AnalyzeUp! Your AI-powered business intelligence copilot designed to turn raw sales, order, and inventory data into profitable strategies.',
    icon: AnalyzeUpIcon,
    iconColor: 'text-primary',
    preferredPlacement: 'bottom',
  },
  {
    id: 'nav-dashboard',
    selector: '[data-tour="nav-dashboard"]',
    title: 'Main Executive Dashboard',
    category: 'Command Center',
    description: 'Monitor store-wide revenue, profit margins, top-selling products, active inventory values, and real-time monthly sales trends.',
    icon: LayoutDashboard,
    iconColor: 'text-primary',
    preferredPlacement: 'bottom',
  },
  {
    id: 'nav-operations',
    selector: '[data-tour="nav-operations"]',
    title: 'Operations: Stock, Orders & Returns',
    category: 'Inventory & Fulfillment',
    description: 'Track real-time inventory valuations, manage purchase orders, analyze supplier fulfillment, and monitor customer return rates.',
    icon: Boxes,
    iconColor: 'text-primary',
    preferredPlacement: 'bottom',
  },
  {
    id: 'nav-suppliers',
    selector: '[data-tour="nav-suppliers"]',
    title: 'Supplier Intelligence & Lead Times',
    category: 'Vendor Network',
    description: 'Evaluate vendor reliability, lead time forecasts, automated reorder thresholds, and vendor contact communications.',
    icon: Truck,
    iconColor: 'text-primary',
    preferredPlacement: 'bottom',
  },
  {
    id: 'nav-executive',
    selector: '[data-tour="nav-executive"]',
    title: 'Executive Intelligence & AI Strategy Lab',
    category: 'C-Suite Analytics',
    description: 'Strategic boardroom KPI simulations, demand forecasting, growth retention curves, and business decision models.',
    icon: Crown,
    iconColor: 'text-primary',
    preferredPlacement: 'bottom',
  },
  {
    id: 'nav-connect',
    selector: '[data-tour="nav-connect"]',
    title: 'Connect & Universal Data Importer',
    category: 'Data Pipelines',
    description: 'Connect Shopify, Google Drive, Zoho, or upload any raw CSV/Excel file with universal AI schema auto-detection.',
    icon: Layers,
    iconColor: 'text-primary',
    preferredPlacement: 'bottom',
  },
  {
    id: 'nav-insights-&-health',
    selector: '[data-tour="nav-insights-&-health"]',
    title: 'Financial Insights & Health Quotient',
    category: 'Financial Diagnostics',
    description: 'Algorithmic 100-point business health quotient, financial margin breakdowns, operational risk indicators, and profit metrics.',
    icon: BarChart3,
    iconColor: 'text-primary',
    preferredPlacement: 'bottom',
  },
  {
    id: 'nav-pricing',
    selector: '[data-tour="nav-pricing"]',
    title: 'Workspace Pricing & Capacity',
    category: 'Plan Management',
    description: 'Explore workspace tiers, live resource consumption limits, automated Razorpay upgrades, and invoice records.',
    icon: CreditCard,
    iconColor: 'text-primary',
    preferredPlacement: 'bottom',
  },
  {
    id: 'notification-bell',
    selector: '[data-tour="notification-bell"]',
    title: 'Proactive Business Alerts',
    category: 'Real-Time Notifications',
    description: 'Instant proactive alerts on margin erosion, stockout warnings, supplier delivery delays, and critical inventory anomalies.',
    icon: Bell,
    iconColor: 'text-primary',
    preferredPlacement: 'bottom',
  },
  {
    id: 'chat-widget',
    selector: '[data-tour="chat-widget"]',
    title: '24/7 AI Business Copilot',
    category: 'Machine Intelligence',
    description: 'Your 24/7 AI business analyst! Click here to ask questions like "Why did profit drop?", "Which stock is dead?", or "Predict next month sales".',
    icon: Bot,
    iconColor: 'text-primary',
    preferredPlacement: 'left',
  },
  {
    id: 'settings-btn',
    selector: '[data-tour="settings-btn"]',
    title: 'Account Settings & Preferences',
    category: 'Workspace Configuration',
    description: 'Customize business preferences, currency, dark/light themes, reset demo data, and manage account security.',
    icon: Settings,
    iconColor: 'text-primary',
    preferredPlacement: 'bottom',
  },
];

interface ElementRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function FeatureTour() {
  const { user } = useUser();
  const { isTourOpen, setIsTourOpen } = useData();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<ElementRect | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const currentStep = TOUR_STEPS[currentStepIndex] || TOUR_STEPS[0];

  const markTourSeen = useCallback(() => {
    if (typeof window === 'undefined') return;
    const uid = user?.uid || 'guest';
    localStorage.setItem(`analyzeup_feature_tour_seen_${uid}`, 'true');
    localStorage.setItem(`analyzeup_feature_tour_completed_${uid}`, 'true');
    localStorage.setItem('analyzeup_feature_tour_seen_global', 'true');
  }, [user]);

  // Measure element location
  const updateTargetRect = useCallback(() => {
    if (!isTourOpen || !currentStep) return;

    const element = document.querySelector(currentStep.selector);
    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    } else {
      // Fallback position in top bar area if element is temporarily not present
      if (typeof window !== 'undefined') {
        setTargetRect({
          top: 60,
          left: window.innerWidth / 2 - 80,
          width: 160,
          height: 40,
        });
      }
    }
  }, [isTourOpen, currentStep]);

  // Handle window resize, scroll, and step changes
  useEffect(() => {
    if (!isTourOpen) return;

    updateTargetRect();
    const handleUpdate = () => updateTargetRect();

    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);

    const timer = setTimeout(updateTargetRect, 80);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [isTourOpen, currentStepIndex, updateTargetRect]);

  const handleNext = useCallback(() => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      markTourSeen();
      setIsTourOpen(false);
      setCurrentStepIndex(0);
    }
  }, [currentStepIndex, setIsTourOpen, markTourSeen]);

  const handlePrev = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  const handleClose = useCallback(() => {
    markTourSeen();
    setIsTourOpen(false);
    setCurrentStepIndex(0);
  }, [markTourSeen, setIsTourOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isTourOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'ArrowRight' || e.key === 'Space') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTourOpen, handleNext, handlePrev, handleClose]);

  if (!isTourOpen) return null;

  // Safe viewport positioning calculation
  const getCardPlacement = () => {
    if (!targetRect || typeof window === 'undefined') {
      return {
        cardStyle: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
        arrowDirection: 'none' as const,
        arrowLeft: 0,
      };
    }

    const cardWidth = Math.min(380, window.innerWidth - 32);
    // Estimated max height with comfortable safety margin
    const cardHeight = 310;
    const margin = 16;

    // Center card horizontally relative to target, clamped strictly within screen margins
    let left = targetRect.left + targetRect.width / 2 - cardWidth / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - cardWidth - margin));

    const spaceBelow = window.innerHeight - (targetRect.top + targetRect.height) - margin;
    const spaceAbove = targetRect.top - margin;

    let top: number;
    let arrowDirection: 'up' | 'down' | 'none' = 'none';

    if (currentStep?.preferredPlacement === 'left' && targetRect.left > cardWidth + 24) {
      // Place to the left of the target element (e.g. for floating chat bot)
      left = targetRect.left - cardWidth - 16;
      top = Math.max(margin, Math.min(targetRect.top + targetRect.height / 2 - cardHeight / 2, window.innerHeight - cardHeight - margin));
      arrowDirection = 'none';
    } else if (spaceBelow >= cardHeight || spaceBelow >= spaceAbove) {
      // Place below target
      top = targetRect.top + targetRect.height + 12;
      // Strictly guarantee it never extends off bottom of screen
      if (top + cardHeight > window.innerHeight - margin) {
        top = Math.max(margin, window.innerHeight - cardHeight - margin);
      }
      arrowDirection = 'up';
    } else {
      // Place above target
      top = targetRect.top - cardHeight - 12;
      if (top < margin) {
        top = margin;
      }
      arrowDirection = 'down';
    }

    // Compute pointer beacon alignment relative to card
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const arrowLeft = Math.max(24, Math.min(targetCenterX - left, cardWidth - 24));

    return {
      cardStyle: {
        top: `${Math.round(top)}px`,
        left: `${Math.round(left)}px`,
      },
      arrowDirection,
      arrowLeft,
    };
  };

  const placement = getCardPlacement();
  const StepIcon = currentStep.icon;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] overflow-hidden pointer-events-auto">
        {/* SVG Mask Spotlight Overlay */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none transition-all duration-300">
          <defs>
            <mask id="tour-spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={targetRect.left - 6}
                  y={targetRect.top - 6}
                  width={targetRect.width + 12}
                  height={targetRect.height + 12}
                  rx="12"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          {/* Dark backdrop overlay */}
          <rect
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.72)"
            mask="url(#tour-spotlight-mask)"
            className="backdrop-blur-[2px]"
          />
        </svg>

        {/* Highlight Ring around Target Element */}
        {targetRect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{
              opacity: 1,
              scale: 1,
              top: targetRect.top - 6,
              left: targetRect.left - 6,
              width: targetRect.width + 12,
              height: targetRect.height + 12,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="absolute rounded-xl border-2 border-primary shadow-[0_0_30px_rgba(212,143,56,0.65)] pointer-events-none z-[101]"
          >
            {/* Corner beacon rings */}
            <span className="absolute -top-1 -left-1 h-2.5 w-2.5 rounded-full bg-primary animate-ping" />
            <span className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping" />
          </motion.div>
        )}

        {/* Feature Information Glass Card */}
        <motion.div
          key={currentStep.id}
          ref={cardRef}
          initial={{ opacity: 0, scale: 0.94, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: -10 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          style={placement.cardStyle}
          className="fixed z-[102] w-[370px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-32px)] overflow-y-auto rounded-2xl border border-primary/30 bg-zinc-950/95 p-5 text-card-foreground shadow-[0_20px_50px_rgba(0,0,0,0.7)] backdrop-blur-2xl"
        >
          {/* Top subtle glow strip */}
          <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl bg-gradient-to-r from-primary/20 via-primary to-amber-400/80" />

          {/* Directional Arrow Notch */}
          {placement.arrowDirection === 'up' && (
            <div
              style={{ left: `${placement.arrowLeft}px` }}
              className="absolute -top-2 -translate-x-1/2 w-4 h-4 rotate-45 bg-zinc-950 border-t border-l border-primary/40"
            />
          )}
          {placement.arrowDirection === 'down' && (
            <div
              style={{ left: `${placement.arrowLeft}px` }}
              className="absolute -bottom-2 -translate-x-1/2 w-4 h-4 rotate-45 bg-zinc-950 border-b border-r border-primary/40"
            />
          )}

          {/* Card Header & Controls */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/30 shadow-inner">
                <StepIcon className={`h-5 w-5 ${currentStep.iconColor}`} />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  {currentStep.category}
                </span>
                <h3 className="text-sm font-bold tracking-tight text-foreground mt-0.5">
                  {currentStep.title}
                </h3>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="text-muted-foreground hover:text-foreground hover:bg-secondary/40 p-1.5 rounded-lg transition-colors cursor-pointer"
              title="Close Tour"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Feature Description */}
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            {currentStep.description}
          </p>

          {/* Progress Indicator Bar */}
          <div className="space-y-1.5 mb-4">
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
              <span>Feature {currentStepIndex + 1} of {TOUR_STEPS.length}</span>
              <span className="text-primary font-bold">{Math.round(((currentStepIndex + 1) / TOUR_STEPS.length) * 100)}% Completed</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-secondary/50 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-amber-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${((currentStepIndex + 1) / TOUR_STEPS.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-border/40">
            {/* Skip Tour Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground rounded-lg"
            >
              Skip Tour
            </Button>

            {/* Step Navigation Buttons */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                disabled={currentStepIndex === 0}
                className="h-8 w-8 p-0 rounded-lg border-border/60 hover:bg-secondary/60 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Button
                size="sm"
                onClick={handleNext}
                className="h-8 px-3.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shadow-md active:scale-95 cursor-pointer"
              >
                {currentStepIndex === TOUR_STEPS.length - 1 ? (
                  <>
                    <span>Finish</span>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    <span>Next</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
