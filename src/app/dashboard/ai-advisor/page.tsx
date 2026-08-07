'use client';

import React, { useState, useEffect, useTransition } from 'react';
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
  Lock
} from 'lucide-react';
import { generateAIAdvisorInsights } from '@/ai/flows/ai-advisor';
import { askAnalyzeUpChat, ChatMessage } from '@/ai/flows/chat';
import { computeBusinessHealth } from '@/lib/command-center-engine';

export default function AIAdvisorPage() {
  const { products, transactions, suppliers, returns = [], activePlan, setShowSubscriptionModal, businessProfile } = useData();
  const [isPending, startTransition] = useTransition();
  const [isChatPending, startChatTransition] = useTransition();
  const [aiInsights, setAiInsights] = useState<{
    businessHealthComment: string;
    deadStockTips: Record<string, string>;
    supplierInsights: Record<string, string>;
  } | null>(null);

  // Chat console state
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hello! I am your AI Advisor. I can answer specific questions regarding your inventory health, supplier optimization, or dead stock liquidation strategy. Ask me anything!",
    },
  ]);

  const suggestions = [
    'Suggest a plan to clear my dead stock.',
    'How can I improve my Business Health Score?',
    'Show me supplier risk breakdown.',
    'Which product has the highest profit runway?'
  ];

  // Computations for real data
  const hasData = products.length > 0;

  // Single Source-of-Truth Business Health Engine
  const healthSummary = computeBusinessHealth(products, transactions, suppliers, returns);

  // Calculate Real Business Health Details
  const healthStats = React.useMemo(() => {
    if (!hasData) {
      return {
        score: 78,
        category: 'Needs Attention',
        badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        inventoryHealth: 82,
        capitalEfficiency: 75,
        marginHealth: 80,
        supplierPerformance: 70,
        totalTiedUpDeadStock: 149943,
        deadStockCount: 2,
        deadStockList: [
          { name: 'Vintage Leather Jacket', sku: 'V-LJ-01', stock: 12, price: 4999, costPrice: 3000, tiedUp: 59988, recommendation: 'Run a bundle promotion with matching leather belts, or offer a 15% discount for newsletter subscribers.' },
          { name: 'Wireless Earbuds Pro', sku: 'WE-P-09', stock: 45, price: 1999, costPrice: 1200, tiedUp: 89955, recommendation: 'Create a flash sale or gift-with-purchase bundle for orders above ₹5,000 to clear inventory.' }
        ],
        supplierDetails: [
          { name: 'Apex Electronics', productCount: 4, value: 145000, avgLeadTime: 10, risk: 'Medium', insight: 'High lead times (10 days). Consider adding backup suppliers for wireless chips to mitigate delay risks.' },
          { name: 'Zenith Textiles', productCount: 8, value: 85000, avgLeadTime: 5, risk: 'Low', insight: 'High reliability and low lead times. Excellent candidate for negotiating better payment terms.' }
        ]
      };
    }

    const saleProductIds = new Set(transactions.filter(t => t.type === 'Sale').map(t => t.productId));
    const deadStockProducts = products.filter(p => p.stock > 0 && !saleProductIds.has(p.id));
    const deadStockCount = deadStockProducts.length;
    
    // Capital tied up in dead stock
    const totalTiedUpDeadStock = deadStockProducts.reduce((sum, p) => sum + (p.stock * (p.costPrice || p.price * 0.6)), 0);

    // Map dead stock list
    const deadStockList = deadStockProducts.map(p => {
      const costPrice = p.costPrice || p.price * 0.6;
      return {
        name: p.name || p.productName || 'Product',
        sku: p.sku || 'N/A',
        stock: p.stock,
        price: p.price,
        costPrice,
        tiedUp: p.stock * costPrice,
        recommendation: aiInsights?.deadStockTips[p.name] || 'Offer a discount of 15-20% to clear this slow-moving stock.'
      };
    });

    // Supplier details
    const supplierDetails = suppliers.map(s => {
      const supplierProducts = products.filter(p => p.supplierId === s.id || p.supplier === s.name);
      const value = supplierProducts.reduce((sum, p) => sum + (p.stock * p.price), 0);
      const avgLeadTime = supplierProducts.length > 0
        ? Math.round(supplierProducts.reduce((sum, p) => sum + (p.leadTimeDays || 7), 0) / supplierProducts.length)
        : 7;
      const risk = avgLeadTime > 10 ? 'High' : avgLeadTime > 6 ? 'Medium' : 'Low';
      return {
        name: s.name,
        productCount: supplierProducts.length,
        value,
        avgLeadTime,
        risk,
        insight: aiInsights?.supplierInsights[s.name] || (risk === 'High' ? 'Long lead time detected. Order earlier to prevent stockout.' : 'Reliable delivery cycle. Low disruption risk.')
      };
    });

    return {
      score: healthSummary.score,
      category: healthSummary.category,
      badgeClass: healthSummary.badgeClass,
      inventoryHealth: healthSummary.factors.inventoryHealth,
      capitalEfficiency: healthSummary.factors.capitalEfficiency,
      marginHealth: healthSummary.factors.marginHealth,
      supplierPerformance: healthSummary.factors.supplierPerformance,
      totalTiedUpDeadStock,
      deadStockCount,
      deadStockList,
      supplierDetails
    };
  }, [products, transactions, suppliers, hasData, aiInsights, healthSummary]);

  // Load insights from AI
  const fetchAIInsights = () => {
    startTransition(async () => {
      try {
        const simplifiedProducts = products.map((p) => ({
          name: p.name || p.productName || 'Product',
          sku: p.sku || '',
          stock: p.stock || 0,
          price: p.price || 0,
          costPrice: p.costPrice || p.price * 0.6 || 0,
          leadTimeDays: p.leadTimeDays || 7,
        }));
        
        const simplifiedTransactions = transactions.slice(0, 30).map((t) => ({
          productName: t.productName || '',
          type: t.type,
          quantity: t.quantity || 0,
          price: t.price || 0,
        }));

        const simplifiedSuppliers = suppliers.map(s => ({
          name: s.name,
          email: s.email
        }));

        const data = await generateAIAdvisorInsights(simplifiedProducts, simplifiedTransactions, simplifiedSuppliers, businessProfile);
        setAiInsights(data);
      } catch (err) {
        console.error('Failed to get AI advisor insights:', err);
      }
    });
  };

  const isPaid = activePlan !== 'Free Trial';

  useEffect(() => {
    if (hasData && isPaid) {
      fetchAIInsights();
    }
  }, [products.length, transactions.length, suppliers.length, isPaid, hasData]);

  const handleSendMessage = (textToSend?: string) => {
    if (!isPaid) return;
    const text = textToSend || chatMessage;
    if (!text.trim() || isChatPending) return;

    setChatMessage('');
    const userMsg: ChatMessage = { role: 'user', content: text };
    setChatHistory(prev => [...prev, userMsg]);

    startChatTransition(async () => {
      try {
        const simplifiedProducts = products.map((p) => ({
          name: p.name || p.productName || 'Product',
          sku: p.sku || '',
          stock: p.stock || 0,
          price: p.price || 0,
          costPrice: p.costPrice || p.price * 0.6 || 0,
          leadTimeDays: p.leadTimeDays || 7,
        }));

        const simplifiedTransactions = transactions.slice(0, 20).map((t) => ({
          productName: t.productName || '',
          type: t.type,
          quantity: t.quantity || 0,
          price: t.price || 0,
        }));

        const reply = await askAnalyzeUpChat(text, chatHistory.slice(-6), simplifiedProducts, simplifiedTransactions);
        setChatHistory(prev => [...prev, { role: 'assistant', content: reply }]);
      } catch (err) {
        console.error(err);
        setChatHistory(prev => [...prev, { role: 'assistant', content: 'Sorry, I failed to process that request.' }]);
      }
    });
  };

  const currentVerdict = aiInsights?.businessHealthComment || healthSummary.summarySentence;

  return (
    <div className="flex flex-col gap-8 w-full max-w-[1600px] mx-auto px-2 sm:px-4">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
            AI Advisor Command Center
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Your advanced AI Business Consultant with automated stock detectors, health scoring, and supplier diagnostics.
          </p>
        </div>
        {hasData && (
          <Button
            size="default"
            variant="outline"
            className="w-fit gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 font-semibold px-4 py-2 rounded-xl text-sm"
            onClick={fetchAIInsights}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
            ) : (
              <RefreshCw className="h-4 w-4 text-emerald-400" />
            )}
            Recalculate Advisor
          </Button>
        )}
      </div>

      {!hasData && (
        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-start gap-3">
          <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm text-amber-500">Viewing Sample Data</h4>
            <p className="text-sm text-muted-foreground mt-1">
              You haven't uploaded or created any inventory products yet. Below is a mock simulation showing how the AI Advisor operates once you begin tracking inventory.
            </p>
          </div>
        </div>
      )}

      {/* Row 1: Health Score & Dynamic Natural Language Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Business Health Score */}
        <Card className="lg:col-span-5 relative overflow-hidden ios-glass border border-emerald-500/20 flex flex-col justify-between shadow-xl p-6">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500/20 via-emerald-500/50 to-emerald-500/20" />
          <CardHeader className="p-0 pb-4 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-foreground">
                    Business Health Score
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Real-time health quotient based on inventory metrics.
                  </CardDescription>
                </div>
              </div>
              <Badge className={`px-3 py-1 font-bold text-xs tracking-wide uppercase ${healthStats.badgeClass}`}>
                {healthStats.category}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0 py-6 space-y-6 flex-1">
            {/* Circle Score Gauge */}
            <div className="flex flex-col items-center justify-center py-2">
              <div className="relative h-32 w-32 flex items-center justify-center rounded-full border-[7px] border-secondary/40 shadow-inner">
                {/* Visual indicator ring */}
                <div 
                  className={`absolute inset-0 rounded-full border-[7px] border-transparent ${
                    healthStats.score >= 80 ? 'border-t-emerald-500 border-r-emerald-500' : 'border-t-amber-500 border-r-amber-500'
                  } rotate-45`} 
                />
                <div className="text-center">
                  <span className="text-4xl font-black text-foreground">{healthStats.score}</span>
                  <span className="text-sm font-medium text-muted-foreground block">/100</span>
                </div>
              </div>
            </div>

            {/* Health parameters */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-muted-foreground flex items-center gap-1.5">Inventory Health</span>
                  <span className="text-emerald-400 font-bold">{healthStats.inventoryHealth}%</span>
                </div>
                <Progress value={healthStats.inventoryHealth} className="h-2 bg-secondary/35 rounded-full" />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-muted-foreground flex items-center gap-1.5">Profit Margin Index</span>
                  <span className="text-emerald-400 font-bold">{healthStats.marginHealth}%</span>
                </div>
                <Progress value={healthStats.marginHealth} className="h-2 bg-secondary/35 rounded-full" />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-muted-foreground flex items-center gap-1.5">Capital Efficiency</span>
                  <span className="text-emerald-400 font-bold">{healthStats.capitalEfficiency}%</span>
                </div>
                <Progress value={healthStats.capitalEfficiency} className="h-2 bg-secondary/35 rounded-full" />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-muted-foreground flex items-center gap-1.5">Supplier Performance</span>
                  <span className="text-emerald-400 font-bold">{healthStats.supplierPerformance}%</span>
                </div>
                <Progress value={healthStats.supplierPerformance} className="h-2 bg-secondary/35 rounded-full" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-secondary/20 rounded-2xl border border-border/40 p-4 space-y-1.5 flex flex-col items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              AI Health Verdict
            </span>
            <p className="text-sm text-foreground/90 leading-relaxed font-medium">
              {currentVerdict}
            </p>
          </CardFooter>
        </Card>

        {/* Natural Language AI Chat Console */}
        <Card className="lg:col-span-7 border border-emerald-500/20 ios-glass flex flex-col justify-between overflow-hidden relative min-h-[480px] shadow-xl p-6">
          <CardHeader className="p-0 pb-4 border-b border-border/40 shrink-0">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
              <Bot className="h-5 w-5 text-emerald-400" />
              Natural Language AI Advisor
            </CardTitle>
            <CardDescription className="text-sm">
              Ask contextual questions about your inventory or business metrics.
            </CardDescription>
          </CardHeader>
          
          <div className="relative flex-1 flex flex-col justify-between mt-4">
            {/* Chat Body & Input with conditional blur */}
            <div className={`flex-1 flex flex-col justify-between transition-all duration-300 ${!isPaid ? 'blur-[5px] select-none pointer-events-none opacity-40' : ''}`}>
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-2 space-y-4 min-h-[280px] max-h-[380px] scrollbar-thin">
                {chatHistory.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 max-w-[85%] ${
                      msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="h-4 w-4" />
                      </div>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-emerald-600 text-white font-semibold rounded-tr-none shadow-sm'
                          : 'bg-secondary/50 text-foreground border border-border/40 rounded-tl-none whitespace-pre-wrap font-medium'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                
                {isChatPending && (
                  <div className="flex gap-3 max-w-[85%] mr-auto items-start">
                    <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                    <div className="rounded-2xl rounded-tl-none px-4 py-2.5 text-sm bg-secondary/30 text-muted-foreground border border-border/20">
                      Advisor is analyzing your inventory logs...
                    </div>
                  </div>
                )}
              </div>

              <CardFooter className="flex-col gap-3.5 border-t border-border/40 pt-4 p-0 shrink-0 mt-3">
                {/* Suggestions */}
                <div className="flex flex-wrap gap-2 w-full">
                  {suggestions.map((query) => (
                    <button
                      key={query}
                      onClick={() => handleSendMessage(query)}
                      disabled={isChatPending}
                      className="text-xs bg-secondary/40 hover:bg-emerald-500/10 border border-border/50 hover:border-emerald-500/30 px-3 py-1.5 rounded-full text-muted-foreground hover:text-emerald-300 transition-all duration-150 active:scale-95 font-semibold"
                    >
                      {query}
                    </button>
                  ))}
                </div>

                {/* Input Form */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2.5 w-full"
                >
                  <Input
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Ask me to review supplier safety margins or spot dead stock..."
                    disabled={isChatPending}
                    className="flex-1 bg-secondary/30 border-border/60 hover:border-border/80 focus:border-emerald-500/80 focus:ring-1 text-sm h-11 rounded-xl px-4"
                  />
                  <Button
                    type="submit"
                    disabled={!chatMessage.trim() || isChatPending}
                    size="icon"
                    className="h-11 w-11 shrink-0 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </CardFooter>
            </div>

            {/* Paywall Overlay */}
            {!isPaid && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-card/10 backdrop-blur-[2px] z-10">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-sm mb-3">
                  <Lock className="h-6 w-6 animate-pulse" />
                </div>
                <p className="font-bold text-base text-foreground">Premium AI Chat Advisor</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-[320px] mb-4">
                  Ask deep, natural-language questions about safety margins, dead stock clearance, or profit margins.
                </p>
                <Button 
                  onClick={() => setShowSubscriptionModal(true)} 
                  size="default"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-600/20 active:scale-95 rounded-xl px-5 py-2 text-sm"
                >
                  Upgrade to Unlock
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Row 2: Dead Stock Detector */}
      <Card className="border border-emerald-500/20 ios-glass relative overflow-hidden shadow-xl p-6">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-red-500/10 via-red-500/40 to-red-500/10" />
        <CardHeader className="p-0 pb-4 border-b border-border/40 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
              <PackageX className="h-5 w-5 text-red-400" />
              Dead Stock Detector
            </CardTitle>
            <CardDescription className="text-sm">
              Identify sluggish items with zero recent sales tie-up value.
            </CardDescription>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground font-semibold">Tied-up Capital</span>
            <span className="font-extrabold text-red-400 text-xl font-mono">
              ₹{healthStats.totalTiedUpDeadStock.toLocaleString('en-IN', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0 pt-4">
          {healthStats.deadStockList.length > 0 ? (
            <div className="overflow-x-auto">
              <Table className="text-sm">
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border/40">
                    <TableHead className="font-bold text-foreground text-xs uppercase tracking-wider">Product</TableHead>
                    <TableHead className="font-bold text-foreground text-xs uppercase tracking-wider">SKU</TableHead>
                    <TableHead className="text-right font-bold text-foreground text-xs uppercase tracking-wider">Stock Level</TableHead>
                    <TableHead className="text-right font-bold text-foreground text-xs uppercase tracking-wider">Retail Price</TableHead>
                    <TableHead className="text-right font-bold text-foreground text-xs uppercase tracking-wider">Tied Capital</TableHead>
                    <TableHead className="min-w-[300px] font-bold text-foreground text-xs uppercase tracking-wider">AI Strategic Advice</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {healthStats.deadStockList.map((item, idx) => (
                    <TableRow key={idx} className="hover:bg-secondary/30 transition-colors">
                      <TableCell className="font-bold text-sm text-foreground">{item.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{item.sku}</TableCell>
                      <TableCell className="text-right font-semibold text-foreground text-sm">{item.stock}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-400 text-sm">₹{item.price.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-right font-bold text-red-400 text-sm">₹{item.tiedUp.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-sm text-muted-foreground flex items-start gap-2 py-3.5 leading-relaxed font-medium">
                        <Sparkles className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                        <span>{item.recommendation}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center border-t border-dashed border-border/40 text-center">
              <ShieldCheck className="h-12 w-12 text-emerald-400 mb-3" />
              <p className="text-base font-bold text-foreground">Zero Dead Stock Detected!</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Congratulations, your current inventory has healthy turnover. Every product has recorded sales in your log.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Row 3: Supplier Intelligence */}
      <Card className="border border-emerald-500/20 ios-glass relative overflow-hidden shadow-xl p-6">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500/10 via-emerald-500/40 to-emerald-500/10" />
        <CardHeader className="p-0 pb-4 border-b border-border/40">
          <CardTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Truck className="h-5 w-5 text-emerald-400" />
            Supplier Intelligence
          </CardTitle>
          <CardDescription className="text-sm">
            Performance runway, supply chains risks, and lead-time optimization indicators.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 pt-4">
          {healthStats.supplierDetails.length > 0 ? (
            <div className="overflow-x-auto">
              <Table className="text-sm">
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border/40">
                    <TableHead className="font-bold text-foreground text-xs uppercase tracking-wider">Supplier</TableHead>
                    <TableHead className="text-center font-bold text-foreground text-xs uppercase tracking-wider">SKUs Supplied</TableHead>
                    <TableHead className="text-right font-bold text-foreground text-xs uppercase tracking-wider">Inventory Volume Value</TableHead>
                    <TableHead className="text-center font-bold text-foreground text-xs uppercase tracking-wider">Avg Lead Time</TableHead>
                    <TableHead className="text-center font-bold text-foreground text-xs uppercase tracking-wider">Lead-Time Risk</TableHead>
                    <TableHead className="min-w-[300px] font-bold text-foreground text-xs uppercase tracking-wider">AI Strategic Recommendations</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {healthStats.supplierDetails.map((sup, idx) => (
                    <TableRow key={idx} className="hover:bg-secondary/30 transition-colors">
                      <TableCell className="font-bold text-sm text-foreground">{sup.name}</TableCell>
                      <TableCell className="text-center font-semibold text-sm">{sup.productCount}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-400 text-sm">₹{sup.value.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-center font-semibold text-sm">{sup.avgLeadTime} days</TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          className={
                            sup.risk === 'High' 
                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 text-xs px-2.5 py-0.5 font-bold' 
                              : sup.risk === 'Medium' 
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs px-2.5 py-0.5 font-bold'
                                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-0.5 font-bold'
                          }
                        >
                          {sup.risk}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground flex items-start gap-2 py-3.5 leading-relaxed font-medium">
                        <Bot className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                        <span>{sup.insight}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center border-t border-dashed border-border/40 text-center">
              <AlertTriangle className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-base font-bold text-foreground">No Suppliers Linked</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Add suppliers in the suppliers page and link them to products to unlock supplier intelligence audits.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
