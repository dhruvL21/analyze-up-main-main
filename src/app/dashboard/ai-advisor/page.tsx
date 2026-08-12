'use client';

import React, { useState, useEffect, useTransition, useRef } from 'react';
import { useData } from '@/context/data-context';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Bot,
  Sparkles,
  Loader2,
  AlertTriangle,
  Activity,
  Truck,
  PackageX,
  Send,
  RefreshCw,
  Info,
  ShieldCheck,
  Lock,
  ArrowRight,
  HelpCircle,
  Coins,
  CheckCircle2,
} from 'lucide-react';
import { askAnalyzeUpChat, ChatMessage } from '@/ai/flows/chat';
import { computeBusinessHealth, generateActionTasks, generateTodayPriorities } from '@/lib/command-center-engine';
import { processCopilotQuery, COPILOT_SUGGESTIONS, CopilotResponse } from '@/lib/copilot-engine';
import { logBusinessAction } from '@/lib/audit-store';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { sanitizePlainData } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export default function AIAdvisorPage() {
  const { products, transactions, suppliers, orders, returns = [], activePlan, setShowSubscriptionModal, businessProfile, updateProduct, addOrder } = useData();
  const { toast } = useToast();
  const router = useRouter();

  const [confirmData, setConfirmData] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);

  const [isPending, startTransition] = useTransition();
  const [isChatPending, startChatTransition] = useTransition();
  const chatBodyRef = useRef<HTMLDivElement>(null);

  // Chat console state
  const [chatMessage, setChatMessage] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [chatHistory, setChatHistory] = useState<(ChatMessage & { copilotRes?: CopilotResponse })[]>([
    {
      role: 'assistant',
      content: "Hello! I am your AI Business Copilot. Ask me questions like 'What should I do today?', 'Why did profit drop?', or 'Which products are dead stock?'.",
    },
  ]);

  const currencySymbol = businessProfile?.currency?.includes('USD') ? '$' : '₹';

  // Computations for real data
  const hasData = products.length > 0;

  // Single Source-of-Truth Business Health Engine
  const healthSummary = computeBusinessHealth(products, transactions, suppliers, returns);
  const todayPriorities = generateTodayPriorities(products, transactions, suppliers);
  const actionTasks = generateActionTasks(products, transactions, suppliers, orders, businessProfile);

  // Dead stock calculation
  const saleProductIds = new Set(transactions.filter(t => t.type === 'Sale').map(t => t.productId));
  const deadStockProducts = products.filter(p => p.stock > 0 && !saleProductIds.has(p.id));
  const totalTiedUpDeadStock = deadStockProducts.reduce((sum, p) => sum + (p.stock * (p.costPrice || p.price * 0.6)), 0);

  const isPaid = activePlan !== 'Free Trial';

  // Auto scroll chat
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTo({
        top: chatBodyRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [chatHistory, isChatPending]);

  // Listen for analyzeup_open_copilot event
  useEffect(() => {
    const handleOpen = (evt: Event) => {
      const customEvt = evt as CustomEvent<{ query?: string }>;
      if (customEvt.detail?.query) {
        handleSendMessage(customEvt.detail.query);
      }
    };
    window.addEventListener('analyzeup_open_copilot', handleOpen);
    return () => window.removeEventListener('analyzeup_open_copilot', handleOpen);
  }, [products, transactions, suppliers, orders, returns, businessProfile]);

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || chatMessage;
    if (!text.trim() || isChatPending) return;

    setChatMessage('');
    const userMsg: ChatMessage = { role: 'user', content: text };
    setChatHistory(prev => [...prev, userMsg]);

    startChatTransition(async () => {
      try {
        const copilotRes = processCopilotQuery(
          text,
          chatHistory,
          products,
          transactions,
          suppliers,
          orders,
          returns,
          businessProfile
        );

        const reply = await askAnalyzeUpChat(
          text,
          chatHistory.slice(-8),
          sanitizePlainData(products),
          sanitizePlainData(transactions),
          sanitizePlainData(suppliers),
          sanitizePlainData(orders),
          sanitizePlainData(returns),
          sanitizePlainData(businessProfile)
        );

        setChatHistory(prev => [
          ...prev,
          {
            role: 'assistant',
            content: reply || copilotRes.answerMarkdown,
            copilotRes,
          },
        ]);
      } catch (err) {
        console.error(err);
        const fallback = processCopilotQuery(text, chatHistory, products, transactions, suppliers, orders, returns, businessProfile);
        setChatHistory(prev => [...prev, { role: 'assistant', content: fallback.answerMarkdown, copilotRes: fallback }]);
      }
    });
  };

  const handleExecuteAction = (recAction: NonNullable<CopilotResponse['recommendedAction']>) => {
    if (recAction.targetRoute) {
      router.push(recAction.targetRoute);
      toast({ title: `🚀 Navigating to ${recAction.label}`, description: 'Opening target module.' });
    } else if (recAction.actionTask) {
      logBusinessAction({
        title: recAction.actionTask.title,
        productName: recAction.actionTask.targetName || 'Catalog Product',
        actionType: recAction.actionTask.actionType as any,
        changeDetails: recAction.actionTask.recommendation,
        impactValue: recAction.actionTask.estimatedBenefit,
      });
      toast({
        title: '✅ Action Added to Action Center!',
        description: `Task "${recAction.actionTask.title}" logged in Action Center.`,
      });
    }
  };

  const categories = ['All', 'Priorities', 'Profitability', 'Inventory', 'Suppliers', 'Procurement', 'Revenue'];

  const filteredSuggestions = selectedCategory === 'All'
    ? COPILOT_SUGGESTIONS
    : COPILOT_SUGGESTIONS.filter(s => s.category === selectedCategory);

  return (
    <div className="flex flex-col gap-8 w-full max-w-[1600px] mx-auto px-2 sm:px-4 pb-12">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/30 pb-4">
        <div>
          <h1 className="text-xl md:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <Bot className="w-7 h-7 text-primary" /> AI Business Copilot Command Center
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Your Decision Intelligence Advisor answering questions using actual business logs, inventory velocity, and vendor data.
          </p>
        </div>
      </div>

      {/* Row 1: Health Score & Copilot Chat Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Business Health Quotient */}
        <Card className="lg:col-span-5 relative overflow-hidden ios-glass border border-primary/20 flex flex-col justify-between shadow-xl p-4 sm:p-6">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary/20 via-primary/60 to-primary/20" />
          <CardHeader className="p-0 pb-4 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-foreground">
                    Business Health Quotient
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Deterministic score derived from inventory & financial metrics.
                  </CardDescription>
                </div>
              </div>
              <Badge className={`px-3 py-1 font-bold text-xs uppercase ${healthSummary.badgeClass}`}>
                {healthSummary.category}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-0 py-6 space-y-6 flex-1">
            {/* Circle Score */}
            <div className="flex flex-col items-center justify-center py-2">
              <div className="relative h-32 w-32 flex items-center justify-center rounded-full border-[7px] border-secondary/40 shadow-inner">
                <div className="text-center">
                  <span className="text-4xl font-black text-foreground">{healthSummary.score}</span>
                  <span className="text-xs font-medium text-muted-foreground block">/100</span>
                </div>
              </div>
            </div>

            {/* Health parameters */}
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between font-semibold">
                  <span className="text-muted-foreground">Inventory Health</span>
                  <span className="text-primary font-bold">{healthSummary.factors.inventoryHealth}%</span>
                </div>
                <Progress value={healthSummary.factors.inventoryHealth} className="h-1.5" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between font-semibold">
                  <span className="text-muted-foreground">Profit Margin Index</span>
                  <span className="text-primary font-bold">{healthSummary.factors.marginHealth}%</span>
                </div>
                <Progress value={healthSummary.factors.marginHealth} className="h-1.5" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between font-semibold">
                  <span className="text-muted-foreground">Capital Efficiency</span>
                  <span className="text-primary font-bold">{healthSummary.factors.capitalEfficiency}%</span>
                </div>
                <Progress value={healthSummary.factors.capitalEfficiency} className="h-1.5" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between font-semibold">
                  <span className="text-muted-foreground">Supplier Performance</span>
                  <span className="text-primary font-bold">{healthSummary.factors.supplierPerformance}%</span>
                </div>
                <Progress value={healthSummary.factors.supplierPerformance} className="h-1.5" />
              </div>
            </div>
          </CardContent>

          <CardFooter className="bg-secondary/20 rounded-2xl border border-border/40 p-4 space-y-1.5 flex flex-col items-start text-xs">
            <span className="font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Executive Verdict
            </span>
            <p className="text-foreground/90 leading-relaxed">{healthSummary.summarySentence}</p>
          </CardFooter>
        </Card>

        {/* Copilot Natural Language Console */}
        <Card className="lg:col-span-7 border border-primary/20 ios-glass flex flex-col justify-between overflow-hidden relative min-h-[520px] shadow-xl p-4 sm:p-6">
          <CardHeader className="p-0 pb-4 border-b border-border/40 shrink-0">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
              <Bot className="h-5 w-5 text-primary" />
              AI Business Copilot Console
            </CardTitle>
            <CardDescription className="text-xs">
              Grounds all answers in actual inventory, transactions, and supplier database logs.
            </CardDescription>
          </CardHeader>

          <div className="relative flex-1 flex flex-col justify-between mt-4">
            <div className={`flex-1 flex flex-col justify-between ${!isPaid ? 'blur-[5px] select-none pointer-events-none opacity-40' : ''}`}>
              {/* Chat Messages */}
              <div
                ref={chatBodyRef}
                className="flex-1 overflow-y-auto p-2 space-y-4 min-h-[300px] max-h-[380px] text-xs scrollbar-thin"
              >
                {chatHistory.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex gap-2.5 max-w-[90%] ${
                      msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="h-4 w-4" />
                      </div>
                    )}
                    <div className="space-y-2">
                      <div
                        className={`rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground font-semibold rounded-tr-none shadow-sm'
                            : 'bg-secondary/40 text-foreground border border-border/40 rounded-tl-none whitespace-pre-wrap font-medium'
                        }`}
                      >
                        {msg.content}
                      </div>

                      {/* Copilot Response Actions & Metrics */}
                      {msg.copilotRes && (
                        <div className="p-3 rounded-2xl bg-secondary/30 border border-border/40 space-y-2 text-xs">
                          {msg.copilotRes.supportingData.length > 0 && (
                            <div className="grid grid-cols-2 gap-1.5">
                              {msg.copilotRes.supportingData.map((d, i) => (
                                <div key={i} className="p-2 rounded-xl bg-background/70 border border-border/30 text-[11px]">
                                  <span className="text-muted-foreground block font-semibold">{d.label}</span>
                                  <span className="font-bold text-foreground block">{d.value}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {msg.copilotRes.recommendedAction && (
                            <Button
                              size="sm"
                              className="w-full h-8 text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:brightness-110 shadow-sm rounded-xl mt-1"
                              onClick={() => handleExecuteAction(msg.copilotRes!.recommendedAction!)}
                            >
                              <ArrowRight className="w-3.5 h-3.5" /> {msg.copilotRes.recommendedAction.label}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isChatPending && (
                  <div className="flex gap-2.5 max-w-[85%] mr-auto items-center text-xs text-muted-foreground">
                    <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                    <span>Copilot is retrieving business context & computing metrics...</span>
                  </div>
                )}
              </div>

              {/* Categorized Suggestions & Input Form */}
              <CardFooter className="flex-col gap-3 border-t border-border/40 pt-4 p-0 shrink-0 mt-3">
                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-1 scrollbar-none text-[11px]">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 rounded-full font-semibold transition-all shrink-0 ${
                        selectedCategory === cat
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-secondary/40 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Suggested Questions */}
                <div className="flex flex-wrap gap-1.5 w-full">
                  {filteredSuggestions.slice(0, 4).map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(item.question)}
                      disabled={isChatPending}
                      className="text-[11px] bg-secondary/40 hover:bg-primary/10 border border-border/50 hover:border-primary/30 px-3 py-1.5 rounded-full text-muted-foreground hover:text-foreground transition-all font-medium"
                    >
                      {item.question}
                    </button>
                  ))}
                </div>

                {/* Input Form */}
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2.5 w-full"
                >
                  <Input
                    value={chatMessage}
                    onChange={e => setChatMessage(e.target.value)}
                    placeholder="Ask Copilot: 'Why is profit down?', 'What to reorder?', or 'Which supplier is best?'..."
                    disabled={isChatPending}
                    className="flex-1 bg-secondary/30 border-border/60 text-xs h-10 rounded-xl px-4"
                  />
                  <Button
                    type="submit"
                    disabled={!chatMessage.trim() || isChatPending}
                    size="icon"
                    className="h-10 w-10 shrink-0 rounded-xl bg-primary text-primary-foreground hover:brightness-110 shadow-md"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </CardFooter>
            </div>

            {!isPaid && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-card/10 backdrop-blur-[2px] z-10">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-sm mb-3">
                  <Lock className="h-6 w-6 animate-pulse" />
                </div>
                <p className="font-bold text-base text-foreground">Premium Copilot Decision Engine</p>
                <Button
                  onClick={() => setShowSubscriptionModal(true)}
                  className="bg-primary text-primary-foreground font-semibold rounded-xl px-5 py-2 text-sm mt-3"
                >
                  Upgrade to Unlock Copilot
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Row 2: Today's Priorities List */}
      <Card className="border border-primary/20 ios-glass p-4 sm:p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" /> Today's Priorities & Action Plan
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Prioritized tasks synthesized from Inventory velocity, Supplier risks, and Profit margins.
            </p>
          </div>
          <Badge className="bg-primary/15 text-primary border-primary/30 font-bold text-xs">
            {actionTasks.length} Active Action Items
          </Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 text-xs">
          {actionTasks.slice(0, 6).map((task) => (
            <div key={task.id} className="p-4 rounded-2xl bg-secondary/30 border border-border/40 space-y-2 flex flex-col justify-between">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Badge variant={task.priority === 'High' ? 'destructive' : 'outline'} className="text-[10px]">
                    {task.priority} Priority
                  </Badge>
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">{task.actionType}</span>
                </div>
                <h4 className="font-bold text-foreground text-sm">{task.title}</h4>
                <p className="text-muted-foreground text-[11px] leading-relaxed">{task.problem}</p>
              </div>
              <div className="pt-2 border-t border-border/30 flex items-center justify-between">
                <span className="text-primary font-semibold text-[11px]">{task.estimatedBenefit}</span>
                <Button
                  size="sm"
                  className="h-7 text-[11px] font-bold rounded-xl gap-1"
                  onClick={() => {
                    const getSlug = (str: string) => (str || 'item').toLowerCase().replace(/[^a-z0-9]/g, '-');
                    const targetProd = products.find(p => p.id === task.targetId || p.sku === task.targetId || getSlug(p.name) === task.targetId);
                    const pName = targetProd?.name || task.targetName || 'Product';

                    setConfirmData({
                      title: task.title,
                      description: `Confirm execution of: "${task.recommendation}". This will apply inventory changes to Firestore.`,
                      onConfirm: async () => {
                        try {
                          if (task.actionType === 'reorder') {
                            const reorderQty = targetProd?.minStock ? targetProd.minStock * 4 : 50;
                            const costPrice = targetProd?.costPrice || (targetProd?.price || 500) * 0.6;
                            const totalCost = Math.round(costPrice * reorderQty);

                            await addOrder({
                              supplierId: targetProd?.supplierId || suppliers[0]?.id || 'sup-1',
                              productId: targetProd?.id || 'prod-1',
                              quantity: reorderQty,
                              unitCost: costPrice,
                              totalCost: totalCost,
                              orderDate: new Date().toISOString(),
                              expectedDeliveryDate: new Date(Date.now() + 7 * 86400000).toISOString(),
                              status: 'Fulfilled',
                            });

                            logBusinessAction({
                              title: 'Executed Purchase Order Reorder',
                              productName: pName,
                              actionType: 'reorder',
                              changeDetails: `Reordered ${reorderQty} units at ${currencySymbol}${costPrice}/unit (${currencySymbol}${totalCost.toLocaleString('en-IN')}).`,
                              impactValue: `+${reorderQty} Units`,
                            });

                            toast({
                              title: '📦 Purchase Order Created & Saved to Audit!',
                              description: `Logged PO for ${reorderQty} units of "${pName}". Click "Change History" to view recorded audit.`,
                            });
                          } else if (task.actionType === 'discount') {
                            if (targetProd) {
                              const oldPrice = targetProd.price || 500;
                              const newPrice = Math.round(oldPrice * 0.8);
                              await updateProduct({
                                ...targetProd,
                                price: newPrice,
                                updatedAt: new Date().toISOString(),
                              });

                              logBusinessAction({
                                title: 'Liquidated Dead Stock (20% Clearance)',
                                productName: pName,
                                actionType: 'discount',
                                changeDetails: `Reduced price from ${currencySymbol}${oldPrice} to ${currencySymbol}${newPrice} (-20%). Unlocked working capital.`,
                                impactValue: `-20% Clearance`,
                              });

                              toast({
                                title: '🏷️ Clearance Promo Applied & Saved to Audit!',
                                description: `Reduced price of "${pName}" to ${currencySymbol}${newPrice}. Click "Change History" to view recorded audit.`,
                              });
                            }
                          } else if (task.actionType === 'price_up') {
                            if (targetProd) {
                              const oldPrice = targetProd.price || 500;
                              const newPrice = Math.round(oldPrice * 1.08);
                              await updateProduct({
                                ...targetProd,
                                price: newPrice,
                                updatedAt: new Date().toISOString(),
                              });

                              logBusinessAction({
                                title: 'Optimized Price (+8%)',
                                productName: pName,
                                actionType: 'price_up',
                                changeDetails: `Adjusted price from ${currencySymbol}${oldPrice} to ${currencySymbol}${newPrice} (+8%) for margin expansion.`,
                                impactValue: `+8% Price Boost`,
                              });

                              toast({
                                title: '📈 Price Optimized & Saved to Audit!',
                                description: `Adjusted price of "${pName}" to ${currencySymbol}${newPrice}. Click "Change History" to view recorded audit.`,
                              });
                            }
                          } else if (task.actionType === 'supplier') {
                            logBusinessAction({
                              title: 'Dispatched Supplier Expedite Notice',
                              productName: task.targetName || 'Supplier',
                              actionType: 'supplier',
                              changeDetails: `Dispatched high-priority delivery expedite to supplier ${task.targetName}.`,
                              impactValue: `Expedited`,
                            });

                            toast({
                              title: '🚚 Supplier Expedite Dispatched',
                              description: `High-priority delivery notice dispatched to ${task.targetName || 'supplier'}.`,
                            });
                          }
                        } catch (err) {
                          console.error('Error executing action:', err);
                          toast({
                            title: 'Execution Error',
                            description: 'Failed to apply recommendation changes.',
                            variant: 'destructive',
                          });
                        }
                      }
                    });
                  }}
                >
                  Execute
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Dialog open={confirmData !== null} onOpenChange={(open) => { if (!open) setConfirmData(null); }}>
        <DialogContent className="max-w-md bg-zinc-950/90 border border-amber-500/20 rounded-3xl ios-glass text-white shadow-2xl p-6">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <AlertTriangle className="w-5 h-5 animate-bounce text-amber-400" />
              </div>
              <DialogTitle className="text-base font-bold text-white">Confirm Business Change</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-zinc-400">
              Are you sure you want to execute this change? This will write modifications directly to your database.
            </DialogDescription>
          </DialogHeader>

          {confirmData && (
            <div className="py-2 text-xs space-y-3">
              <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1.5">
                <div className="text-zinc-200 font-bold">{confirmData.title}</div>
                <div className="text-zinc-300 leading-relaxed">{confirmData.description}</div>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-row items-center justify-end gap-2 pt-4 border-t border-zinc-800/40">
            <Button
              variant="ghost"
              onClick={() => setConfirmData(null)}
              className="rounded-xl text-xs hover:bg-zinc-900 text-zinc-400 hover:text-white px-3"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (confirmData) {
                  confirmData.onConfirm();
                  setConfirmData(null);
                }
              }}
              className="bg-amber-500 hover:bg-amber-600 text-black font-extrabold rounded-xl text-xs px-4"
            >
              Confirm & Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
