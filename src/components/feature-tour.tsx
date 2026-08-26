'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '@/context/data-context';
import {
  LayoutDashboard,
  RefreshCw,
  Boxes,
  ShoppingCart,
  Truck,
  Sparkles,
  BarChart3,
  Activity,
  Bot,
  Sun,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  Play,
  Pause,
  Compass,
  CheckCircle2,
  MousePointer2,
  Lightbulb,
  Crown,
  Layers,
  Bell,
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
    title: 'Executive Intelligence & Audit Log',
    category: 'C-Suite Analytics',
    description: 'Strategic boardroom KPI simulations, business audit logs for POs & promos, and live workspace usage limits.',
    icon: Crown,
    iconColor: 'text-primary',
    preferredPlacement: 'bottom',
  },
  {
    id: 'nav-connect',
    selector: '[data-tour="nav-connect"]',
    title: 'Connect & Universal Data Importer',
    category: 'Data Pipelines',
    description: 'Connect Shopify, Zoho, Tally, or upload any raw CSV/Excel file with universal AI schema auto-detection.',
    icon: Layers,
    iconColor: 'text-primary',
    preferredPlacement: 'bottom',
  },
  {
    id: 'nav-ai-copilot',
    selector: '[data-tour="nav-ai-copilot"]',
    title: 'AI Copilot & Predictive Stock Advisor',
    category: 'Machine Intelligence',
    description: 'Predict dead stock risk, run statistical time-series demand forecasts, and receive autonomous business analyst guidance.',
    icon: Sparkles,
    iconColor: 'text-primary',
    preferredPlacement: 'bottom',
  },
  {
    id: 'nav-insights-&-health',
    selector: '[data-tour="nav-insights-&-health"]',
    title: 'Deep Insights & Business Health Index',
    category: 'Financial Diagnostics',
    description: 'Overall store health rating (0-100), financial safety score, operational risk indicators, and multi-dimensional charts.',
    icon: BarChart3,
    iconColor: 'text-primary',
    preferredPlacement: 'bottom',
  },
  {
    id: 'ai-brief',
    selector: '[data-tour="ai-brief"]',
    title: "Today's AI Brief & Diagnostics",
    category: 'Daily AI Diagnostics',
    description: 'Automated daily inventory health scoring (0-100), immediate stockout risk warnings, and slow-moving item alerts generated every morning.',
    icon: Sparkles,
    iconColor: 'text-primary',
    preferredPlacement: 'bottom',
  },
  {
    id: 'ai-suggestions',
    selector: '[data-tour="ai-suggestions"]',
    title: 'AI Strategy & Savings Suggestions',
    category: 'Smart Recommendations',
    description: 'Actionable AI suggestions highlighting exact capital savings and steps to liquidate dead stock or reorder top performers.',
    icon: Lightbulb,
    iconColor: 'text-primary',
    preferredPlacement: 'bottom',
  },
  {
    id: 'notification-bell',
    selector: '[data-tour="notification-bell"]',
    title: 'Proactive Business Alerts',
    category: 'Real-Time Notifications',
    description: 'Instant alerts on margin erosion, stockout warnings, supplier delivery delays, and critical anomalies.',
    icon: Bell,
    iconColor: 'text-primary',
    preferredPlacement: 'bottom',
  },
  {
    id: 'chat-widget',
    selector: '[data-tour="chat-widget"]',
    title: 'Ask AI Copilot Chatbot',
    category: '24/7 AI Assistant',
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
    description: 'Customize workspace settings, update account password credentials, switch themes, and manage subscription tiers.',
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
  const { isTourOpen, setIsTourOpen } = useData();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<ElementRect | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentStep = TOUR_STEPS[currentStepIndex];

  // Measure element location
  const updateTargetRect = useCallback(() => {
    if (!isTourOpen || !currentStep) return;

    const element = document.querySelector(currentStep.selector);
    if (element) {
      const rect = element.getBoundingClientRect();
      // Scroll into view if outside the visible safe zone
      if (rect.top < 60 || rect.bottom > window.innerHeight - 80) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      const updated = element.getBoundingClientRect();
      setTargetRect({
        top: updated.top,
        left: updated.left,
        width: updated.width,
        height: updated.height,
      });
    } else {
      // Fallback center position if element is mobile hidden or not present
      setTargetRect({
        top: window.innerHeight / 2 - 30,
        left: window.innerWidth / 2 - 60,
        width: 120,
        height: 60,
      });
    }
  }, [isTourOpen, currentStep]);

  // Handle window resize and scroll
  useEffect(() => {
    if (!isTourOpen) return;

    updateTargetRect();

    const handleResize = () => updateTargetRect();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [isTourOpen, currentStepIndex, updateTargetRect]);

  // Handle Auto-Play timer (4 seconds per step)
  useEffect(() => {
    if (!isTourOpen || !isPlaying) {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
      return;
    }

    autoPlayTimerRef.current = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < TOUR_STEPS.length - 1) {
          return prev + 1;
        } else {
          setIsPlaying(false);
          return prev;
        }
      });
    }, 4500);

    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    };
  }, [isTourOpen, isPlaying, currentStepIndex]);

  const handleNext = useCallback(() => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      setIsTourOpen(false);
      setCurrentStepIndex(0);
    }
  }, [currentStepIndex, setIsTourOpen]);

  const handlePrev = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isTourOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsTourOpen(false);
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
  }, [isTourOpen, handleNext, handlePrev, setIsTourOpen]);

  if (!isTourOpen) return null;

  const handleClose = () => {
    setIsTourOpen(false);
    setCurrentStepIndex(0);
  };

  // Calculate card positioning inside window bounds
  const getCardStyle = () => {
    if (!targetRect || typeof window === 'undefined') {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }

    const cardWidth = Math.min(380, window.innerWidth - 32);
    const cardHeight = 290;
    const margin = 16;

    let left = targetRect.left + targetRect.width / 2 - cardWidth / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - cardWidth - margin));

    const spaceBelow = window.innerHeight - (targetRect.top + targetRect.height) - margin;
    const spaceAbove = targetRect.top - margin;

    let top: number;

    // If more space above or target is in lower half of viewport
    if (spaceBelow < cardHeight + 20 && spaceAbove > spaceBelow) {
      top = targetRect.top - cardHeight - 16;
    } else {
      top = targetRect.top + targetRect.height + 16;
    }

    // Strictly clamp top within visible viewport bounds
    top = Math.max(margin, Math.min(top, window.innerHeight - cardHeight - margin));

    return {
      top: `${top}px`,
      left: `${left}px`,
    };
  };

  // Compute pointer positioning relative to target
  const isTargetInLowerHalf = targetRect ? targetRect.top > window.innerHeight / 2 : false;
  const pointerX = targetRect ? targetRect.left + targetRect.width / 2 : (typeof window !== 'undefined' ? window.innerWidth / 2 : 200);
  const pointerY = targetRect 
    ? (isTargetInLowerHalf ? targetRect.top - 24 : targetRect.top + targetRect.height + 8) 
    : (typeof window !== 'undefined' ? window.innerHeight / 2 : 200);

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

        {/* Highlight Ring around Target Icon */}
        {targetRect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: 1,
              scale: 1,
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
            }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            className="absolute rounded-xl border-2 border-primary/90 shadow-[0_0_35px_rgba(212,143,56,0.65)] pointer-events-none z-[101]"
          >
            {/* Corner beacon rings */}
            <span className="absolute -top-1 -left-1 h-3 w-3 rounded-full bg-primary animate-ping" />
            <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-amber-400 animate-ping" />
          </motion.div>
        )}

        {/* Animated Pointer / Arrow pointing directly at target icon */}
        {targetRect && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{
              opacity: 1,
              x: pointerX - 12,
              y: pointerY + 2,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="absolute z-[103] pointer-events-none flex flex-col items-center"
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
              className="relative flex items-center justify-center"
            >
              <div className="absolute h-8 w-8 rounded-full bg-primary/40 blur-md animate-pulse" />
              <MousePointer2 className="h-7 w-7 text-amber-400 drop-shadow-[0_0_12px_rgba(212,143,56,0.95)]" />
            </motion.div>
          </motion.div>
        )}

        {/* Feature Information Glass Card */}
        <motion.div
          key={currentStep.id}
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: -15 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          style={getCardStyle()}
          className="fixed z-[102] w-[370px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-32px)] overflow-y-auto rounded-2xl border border-primary/30 bg-card/95 p-5 text-card-foreground shadow-[0_16px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
        >
          {/* Top subtle glow strip */}
          <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl bg-gradient-to-r from-primary/20 via-primary to-amber-400/80" />

          {/* Card Header & Controls */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/30 shadow-inner">
                <StepIcon className={`h-6 w-6 ${currentStep.iconColor}`} />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  {currentStep.category}
                </span>
                <h3 className="text-base font-bold tracking-tight text-foreground mt-0.5">
                  {currentStep.title}
                </h3>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="text-muted-foreground hover:text-foreground hover:bg-secondary/40 p-1.5 rounded-lg transition-colors"
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
              <span className="text-primary">{Math.round(((currentStepIndex + 1) / TOUR_STEPS.length) * 100)}% Completed</span>
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
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
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
                className="h-8 px-3 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 gap-1 shadow-md active:scale-95"
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
