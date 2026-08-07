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
    description: 'Actionable AI suggestions highlighting exact dollar/rupee capital savings and steps to liquidate dead stock or reorder top performers.',
    icon: Lightbulb,
    iconColor: 'text-primary',
    preferredPlacement: 'bottom',
  },
  {
    id: 'nav-ai-advisor',
    selector: '[data-tour="nav-ai-advisor"]',
    title: 'Predictive AI Stock Advisor',
    category: 'AI Machine Intelligence',
    description: 'Leverage smart algorithms that forecast dead stock risks, predict reorder timelines, calculate stockout probabilities, and maximize ROI.',
    icon: Sparkles,
    iconColor: 'text-primary',
    preferredPlacement: 'bottom',
  },
  {
    id: 'nav-business-health',
    selector: '[data-tour="nav-business-health"]',
    title: 'Business Health Index & Features',
    category: 'Financial Health',
    description: 'View overall store health rating (0-100), financial safety score, operational risk indicators, and strategic growth advice.',
    icon: Activity,
    iconColor: 'text-primary',
    preferredPlacement: 'bottom',
  },
  {
    id: 'nav-returns',
    selector: '[data-tour="nav-returns"]',
    title: 'Returns & Refund Analytics',
    category: 'Profit Protection',
    description: 'Track customer product returns, refund costs, return rates by category, and identify defective inventory items before margins drop.',
    icon: RefreshCw,
    iconColor: 'text-primary',
    preferredPlacement: 'bottom',
  },
  {
    id: 'nav-inventory',
    selector: '[data-tour="nav-inventory"]',
    title: 'Smart Inventory Hub',
    category: 'Stock Control',
    description: 'Track real-time stock levels, automated inventory valuations, low-stock threshold alerts, and instant stock update actions.',
    icon: Boxes,
    iconColor: 'text-primary',
    preferredPlacement: 'bottom',
  },
  {
    id: 'nav-order',
    selector: '[data-tour="nav-order"]',
    title: 'Orders & Fulfillment Center',
    category: 'Order Management',
    description: 'Streamline purchase orders, filter order statuses (Pending, Processing, Completed), and analyze channel performance.',
    icon: ShoppingCart,
    iconColor: 'text-primary',
    preferredPlacement: 'bottom',
  },
  {
    id: 'nav-suppliers',
    selector: '[data-tour="nav-suppliers"]',
    title: 'Supplier Intelligence',
    category: 'Vendor Network',
    description: 'Track supplier delivery lead times, vendor reliability scores, fulfillment velocity, and vendor contact info.',
    icon: Truck,
    iconColor: 'text-primary',
    preferredPlacement: 'bottom',
  },
  {
    id: 'nav-insights',
    selector: '[data-tour="nav-insights"]',
    title: 'Deep Insights Visualizer',
    category: 'Advanced Data Science',
    description: 'Explore multi-dimensional data charts, automated anomaly detection, custom filtering, and instant executive summaries.',
    icon: BarChart3,
    iconColor: 'text-primary',
    preferredPlacement: 'bottom',
  },
  {
    id: 'chat-widget',
    selector: '[data-tour="chat-widget"]',
    title: 'Ask AI Copilot Chatbot',
    category: 'Interactive AI Assistant',
    description: 'Your 24/7 AI business analyst! Click here to ask questions like "Why did profit drop?", "Which stock is dead?", or "Predict next month sales".',
    icon: Bot,
    iconColor: 'text-primary',
    preferredPlacement: 'left',
  },
  {
    id: 'theme-toggle',
    selector: '[data-tour="theme-toggle"]',
    title: 'Dark / Light Theme Switcher',
    category: 'Customization',
    description: 'Seamlessly toggle between sleek dark mode and bright light mode for comfortable day or night analysis.',
    icon: Sun,
    iconColor: 'text-primary',
    preferredPlacement: 'bottom',
  },
  {
    id: 'settings-btn',
    selector: '[data-tour="settings-btn"]',
    title: 'Account Settings & Plans',
    category: 'User Workspace',
    description: 'Customize workspace settings, view user profiles, and manage subscription tiers anytime.',
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
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
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
  }, [isTourOpen, currentStepIndex]);

  if (!isTourOpen) return null;

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      setIsTourOpen(false);
      setCurrentStepIndex(0);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleClose = () => {
    setIsTourOpen(false);
    setCurrentStepIndex(0);
  };

  // Compute pointer positioning
  const pointerX = targetRect ? targetRect.left + targetRect.width / 2 : window.innerWidth / 2;
  const pointerY = targetRect ? targetRect.top + targetRect.height + 12 : window.innerHeight / 2;

  // Calculate card positioning inside window bounds
  const getCardStyle = () => {
    if (!targetRect) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }

    const cardWidth = 380;
    const cardHeight = 240;
    const margin = 20;

    let left = targetRect.left + targetRect.width / 2 - cardWidth / 2;
    let top = targetRect.top + targetRect.height + 24;

    // Adjust left bounds
    if (left + cardWidth > window.innerWidth - margin) {
      left = window.innerWidth - cardWidth - margin;
    }
    if (left < margin) {
      left = margin;
    }

    // Adjust top bounds if element is near bottom
    if (top + cardHeight > window.innerHeight - margin) {
      top = targetRect.top - cardHeight - 24;
    }
    if (top < margin) {
      top = margin;
    }

    return {
      top: `${top}px`,
      left: `${left}px`,
    };
  };

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
          className="fixed z-[102] w-[370px] max-w-[calc(100vw-2rem)] rounded-2xl border border-primary/30 bg-card/95 p-5 text-card-foreground shadow-[0_16px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
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
