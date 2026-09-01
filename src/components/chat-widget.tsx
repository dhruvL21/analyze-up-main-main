'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { useData } from '@/context/data-context';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { X, Send, Bot, Sparkles, Loader2, Lock, PlusCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { ChatMessage } from '@/ai/flows/chat';
import type { CopilotResponse } from '@/lib/copilot-engine';
import { logBusinessAction } from '@/lib/audit-store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { sanitizePlainData } from '@/lib/utils';
import { FormattedMarkdown } from '@/components/formatted-markdown';

export function ChatWidget() {
  const { products, transactions, suppliers, orders, returns, activePlan, setShowSubscriptionModal, businessProfile, incrementAiQueryCount } = useData();
  const { toast } = useToast();
  const router = useRouter();

  const hasData = (products && products.length > 0) || (transactions && transactions.length > 0);

  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<(ChatMessage & { copilotRes?: CopilotResponse })[]>([
    {
      role: 'assistant',
      content: hasData
        ? "Hello! I'm your AnalyzeUp AI Business Copilot. Ask me questions like 'What should I do today?', 'Why did profit drop?', or 'Which supplier is best?'."
        : "Hello! I am your AI Business Copilot. Ask me questions about uploading your business data, our 22-column CSV template, or click any of the quick questions below to get started!",
    },
  ]);
  const [isPending, startTransition] = useTransition();
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    import('@/lib/copilot-engine').then(({ getCopilotSuggestions }) => {
      if (active) setSuggestions(getCopilotSuggestions(hasData).slice(0, 4).map((suggestion) => suggestion.question));
    });
    return () => { active = false; };
  }, [isOpen, hasData]);

  // Listen for global analyzeup_open_copilot trigger
  useEffect(() => {
    const handleOpenCopilot = (evt: Event) => {
      const customEvt = evt as CustomEvent<{ query?: string }>;
      setIsOpen(true);
      if (customEvt.detail?.query) {
        const queryText = customEvt.detail.query;
        const userMsg: ChatMessage = { role: 'user', content: queryText };
        setMessages(prev => [...prev, userMsg]);

        startTransition(async () => {
          try {
            const [{ processCopilotQuery }, { askAnalyzeUpChat }] = await Promise.all([
              import('@/lib/copilot-engine'),
              import('@/ai/flows/chat'),
            ]);
            const copilotRes = processCopilotQuery(
              queryText,
              messages,
              products,
              transactions,
              suppliers,
              orders,
              returns,
              businessProfile
            );

            const responseText = await askAnalyzeUpChat(
              queryText,
              messages.slice(-8),
              sanitizePlainData(products),
              sanitizePlainData(transactions),
              sanitizePlainData(suppliers),
              sanitizePlainData(orders),
              sanitizePlainData(returns),
              sanitizePlainData(businessProfile)
            );

            setMessages(prev => [
              ...prev,
              {
                role: 'assistant',
                content: responseText || copilotRes.answerMarkdown,
                copilotRes,
              },
            ]);
          } catch (err) {
            console.error('Error generating AI Copilot response:', err);
          }
        });
      }
    };

    window.addEventListener('analyzeup_open_copilot', handleOpenCopilot);
    return () => window.removeEventListener('analyzeup_open_copilot', handleOpenCopilot);
  }, [products, transactions, suppliers, orders, returns, businessProfile, messages]);

  const isPaid = activePlan !== 'Free Trial';

  // Auto scroll to bottom
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTo({
        top: chatBodyRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, isPending, isOpen]);

  const handleSendMessage = (messageText: string) => {
    if (!messageText.trim() || isPending) return;

    const userMsg: ChatMessage = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');

    // Increment workspace AI Copilot query counter
    incrementAiQueryCount(1);

    // Load AI engines only when the user opens a Copilot conversation. This keeps
    // their code out of the initial dashboard bundle while preserving the same flow.
    startTransition(async () => {
      let fallbackAnswer: string | null = null;
      try {
        const { processCopilotQuery } = await import('@/lib/copilot-engine');
        const copilotRes = processCopilotQuery(
          messageText,
          messages,
          products,
          transactions,
          suppliers,
          orders,
          returns,
          businessProfile
        );
        fallbackAnswer = copilotRes.answerMarkdown;

        if (copilotRes.intent !== 'UNKNOWN') {
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: copilotRes.answerMarkdown,
            },
          ]);
          return;
        }

        const { askAnalyzeUpChat } = await import('@/ai/flows/chat');
        const responseText = await askAnalyzeUpChat(
          messageText,
          messages.slice(-6),
          sanitizePlainData(products.slice(0, 30)),
          sanitizePlainData(transactions.slice(-20)),
          sanitizePlainData(suppliers.slice(0, 10)),
          sanitizePlainData(orders.slice(0, 10)),
          sanitizePlainData(returns.slice(0, 10)),
          sanitizePlainData(businessProfile)
        );

        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: responseText || copilotRes.answerMarkdown,
          },
        ]);
      } catch (err) {
        console.error('Chat error:', err);
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: fallbackAnswer || 'I could not complete that analysis. Please try again.',
          },
        ]);
      }
    });
  };

  const handleExecuteCopilotAction = (recAction: NonNullable<CopilotResponse['recommendedAction']>) => {
    if (recAction.targetRoute) {
      router.push(recAction.targetRoute);
      setIsOpen(false);
      toast({
        title: `🚀 Navigating to ${recAction.label}`,
        description: 'Opening module for execution.',
      });
    } else if (recAction.actionTask) {
      logBusinessAction({
        title: recAction.actionTask.title,
        productName: recAction.actionTask.targetName || 'Catalog Item',
        actionType: recAction.actionTask.actionType as any,
        changeDetails: recAction.actionTask.recommendation,
        impactValue: recAction.actionTask.estimatedBenefit,
      });
      toast({
        title: '✅ Action Added to AI Action Center!',
        description: `Task "${recAction.actionTask.title}" logged in Action Center & Audit History.`,
      });
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Panel */}
      {isOpen && (
        <div className="w-[440px] max-w-[calc(100vw-2rem)] h-[580px] max-h-[calc(100dvh-120px)] rounded-3xl border border-border/80 bg-card/90 shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 relative">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
          <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-primary/5 blur-[80px]" />

          {!isPaid ? (
            <div className="flex-1 flex flex-col justify-between p-6 h-full relative z-10">
              <div className="flex justify-end">
                <button
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-md mb-4">
                  <Lock className="h-6 w-6 animate-pulse" />
                </div>
                <h4 className="font-bold text-lg text-foreground tracking-tight mb-2">
                  Unlock AI Business Copilot
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-[280px] mb-6">
                  Get instant grounded answers about your profits, products, vendor risks, and reorder quantities.
                </p>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setShowSubscriptionModal(true);
                  }}
                  className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-primary px-6 font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90"
                >
                  Upgrade Plan
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="relative flex items-center justify-between px-5 py-3.5 border-b border-border/40 bg-secondary/20">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/25 shadow-sm">
                    <Bot className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-foreground tracking-tight flex items-center gap-1.5">
                      AnalyzeUp Copilot
                    </h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                      </span>
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                        Decision Intelligence
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Messages Body */}
              <div
                ref={chatBodyRef}
                className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 text-xs scrollbar-thin"
              >
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex gap-2.5 max-w-[90%] ${
                      msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/20 mt-1 shadow-sm">
                        <Sparkles className="h-3.5 w-3.5" />
                      </div>
                    )}
                    <div className="space-y-2">
                      <div
                        className={`rounded-2xl px-4 py-3 leading-relaxed text-xs ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground font-medium rounded-tr-none shadow-sm'
                            : 'bg-secondary/40 text-foreground border border-border/40 rounded-tl-none font-normal'
                        }`}
                      >
                        {msg.role === 'user' ? (
                          msg.content
                        ) : (
                          <FormattedMarkdown content={msg.content} />
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {isPending && (
                  <div className="flex gap-2.5 max-w-[85%] mr-auto items-center text-xs text-muted-foreground">
                    <div className="h-7 w-7 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    </div>
                    <span>Analyzing business logs & intelligence engines...</span>
                  </div>
                )}
              </div>

              {/* Suggestions & Input Bar */}
              <div className="p-3 border-t border-border/40 bg-secondary/10 space-y-2 shrink-0">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(suggestion)}
                      disabled={isPending}
                      className="text-[11px] bg-secondary/50 hover:bg-primary/10 border border-border/50 hover:border-primary/30 px-2.5 py-1 rounded-full text-muted-foreground hover:text-foreground transition-all shrink-0 font-medium"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>

                <form
                  onSubmit={e => {
                    e.preventDefault();
                    handleSendMessage(inputMessage);
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    value={inputMessage}
                    onChange={e => setInputMessage(e.target.value)}
                    placeholder="Ask Copilot anything about your business..."
                    disabled={isPending}
                    className="flex-1 bg-secondary/40 border border-border/60 focus:border-primary text-xs h-9 rounded-xl px-3 text-foreground placeholder:text-muted-foreground outline-none"
                  />
                  <Button
                    type="submit"
                    disabled={!inputMessage.trim() || isPending}
                    size="icon"
                    className="h-9 w-9 shrink-0 rounded-xl bg-primary text-primary-foreground hover:brightness-110 shadow-sm"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      )}

      {/* Floating Trigger Button */}
      <button
        data-tour="chat-widget"
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex h-12 w-12 items-center justify-center rounded-2xl bg-transparent hover:bg-secondary/50 text-foreground transition-all duration-300 hover:scale-105 active:scale-95 border border-border/40 backdrop-blur-md shadow-lg"
      >
        {isOpen ? (
          <X className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
        ) : (
          <div className="relative flex items-center justify-center">
            <Bot className="h-5.5 w-5.5 text-primary transition-transform duration-300 group-hover:rotate-12" />
            <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-amber-400 animate-pulse" />
          </div>
        )}
      </button>
    </div>
  );
}
