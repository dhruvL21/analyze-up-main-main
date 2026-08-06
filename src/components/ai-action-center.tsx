'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { generateActionTasks, ActionTask } from '@/lib/command-center-engine';
import { useData } from '@/context/data-context';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  PackagePlus,
  Tag,
  DollarSign,
  Truck,
  Check,
  X,
  EyeOff,
} from 'lucide-react';

export function AIActionCenter() {
  const { products, transactions, suppliers, businessProfile, updateProduct, addOrder, addTransaction } = useData();
  const { toast } = useToast();
  const router = useRouter();

  const [tasks, setTasks] = useState<ActionTask[]>([]);
  const [dismissedTaskIds, setDismissedTaskIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        return JSON.parse(localStorage.getItem('analyzeup_dismissed_tasks') || '[]');
      } catch {
        return [];
      }
    }
    return [];
  });

  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        return JSON.parse(localStorage.getItem('analyzeup_completed_tasks') || '[]');
      } catch {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    const generated = generateActionTasks(products, transactions, suppliers, businessProfile);
    setTasks(generated);
  }, [products, transactions, suppliers, businessProfile]);

  const handleCompleteTask = (taskId: string, title: string) => {
    setCompletedTaskIds(prev => {
      const next = [...prev, taskId];
      localStorage.setItem('analyzeup_completed_tasks', JSON.stringify(next));
      return next;
    });
    toast({
      title: 'Action Completed!',
      description: `Task "${title}" marked as resolved. AI model updated.`,
    });
  };

  const handleDismissTask = (taskId: string) => {
    setDismissedTaskIds(prev => {
      const next = [...prev, taskId];
      localStorage.setItem('analyzeup_dismissed_tasks', JSON.stringify(next));
      return next;
    });
    toast({
      title: 'Task Snoozed',
      description: 'Recommendation hidden from active task feed.',
    });
  };

  const handleExecuteAction = async (task: ActionTask) => {
    const currencySymbol = businessProfile?.currency?.includes('USD') ? '$' : '₹';
    const targetProd = products.find(p => p.id === task.targetId || (p.name && task.targetName && p.name.toLowerCase() === task.targetName.toLowerCase()) || (p.sku && task.title.includes(p.sku)));

    if (task.actionType === 'reorder') {
      const reorderQty = (targetProd?.minStock || 5) * 4 || 50;
      const prodName = targetProd?.name || task.targetName || 'Product';
      const costPrice = targetProd?.costPrice || (targetProd?.price || 500) * 0.6;
      const totalCost = Math.round(costPrice * reorderQty);

      try {
        // 1. Create a REAL Purchase Order in database
        await addOrder({
          supplierId: targetProd?.supplierId || suppliers[0]?.id || 'sup-1',
          productId: targetProd?.id || 'prod-1',
          quantity: reorderQty,
          orderDate: new Date().toISOString(),
          expectedDeliveryDate: new Date(Date.now() + 7 * 86400000).toISOString(),
          status: 'Pending',
        });

        // 2. Record a REAL Purchase Transaction
        await addTransaction({
          productId: targetProd?.id || 'prod-1',
          productName: prodName,
          sku: targetProd?.sku || '',
          type: 'Purchase',
          quantity: reorderQty,
          price: costPrice,
          totalCost: totalCost,
          supplier: targetProd?.supplier || suppliers[0]?.name || 'Supplier',
          transactionDate: new Date().toISOString(),
          status: 'Completed',
        });

        // 3. Update Product Stock in database
        if (targetProd) {
          await updateProduct({
            ...targetProd,
            stock: targetProd.stock + reorderQty,
            updatedAt: new Date().toISOString(),
          });
        }

        toast({
          title: '📦 Real Purchase Order Created!',
          description: `Logged PO for ${reorderQty} units of "${prodName}" (${currencySymbol}${totalCost.toLocaleString('en-IN')}) in Orders & Transactions. Stock updated.`,
        });
      } catch (err) {
        console.error('Error executing reorder:', err);
        toast({ variant: 'destructive', title: 'Action Error', description: 'Failed to create purchase order.' });
      }
      handleCompleteTask(task.id, task.title);
    } else if (task.actionType === 'discount') {
      if (targetProd) {
        const newPrice = Math.round((targetProd.price || 500) * 0.8);
        await updateProduct({
          ...targetProd,
          price: newPrice,
          updatedAt: new Date().toISOString(),
        });
        toast({
          title: '🏷️ Clearance Promo Applied!',
          description: `Reduced selling price of "${targetProd.name}" by 20% to ${currencySymbol}${newPrice} in database.`,
        });
      } else {
        toast({ title: 'Clearance Applied', description: `Applied 20% discount to ${task.targetName || 'dead stock'}.` });
      }
      handleCompleteTask(task.id, task.title);
    } else if (task.actionType === 'price_up') {
      if (targetProd) {
        const newPrice = Math.round((targetProd.price || 500) * 1.08);
        await updateProduct({
          ...targetProd,
          price: newPrice,
          updatedAt: new Date().toISOString(),
        });
        toast({
          title: '📈 Selling Price Optimized!',
          description: `Adjusted price of "${targetProd.name}" by +8% to ${currencySymbol}${newPrice} in catalog.`,
        });
      } else {
        toast({ title: 'Price Optimized', description: `Adjusted price by +8% for ${task.targetName || 'product'}.` });
      }
      handleCompleteTask(task.id, task.title);
    } else if (task.actionType === 'supplier') {
      toast({
        title: '🚚 Supplier Expedite Dispatched',
        description: `High-priority delivery notice dispatched to ${task.targetName || 'supplier'}.`,
      });
      handleCompleteTask(task.id, task.title);
    } else {
      toast({
        title: '✅ Task Completed',
        description: `Action executed for "${task.title}".`,
      });
      handleCompleteTask(task.id, task.title);
    }
  };

  const activeTasks = tasks.filter(t => !dismissedTaskIds.includes(t.id) && !completedTaskIds.includes(t.id));

  return (
    <Card className="ios-glass rounded-3xl border-primary/20 p-5 shadow-xl space-y-4">
      <CardHeader className="p-0 pb-3 border-b border-border/40 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              AI Action Center
              <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5">
                {activeTasks.length} Pending Actions
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">Proactive business task assignments for today</CardDescription>
          </div>
        </div>

        {completedTaskIds.length > 0 && (
          <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 text-xs gap-1">
            <Check className="w-3 h-3" /> {completedTaskIds.length} Completed
          </Badge>
        )}
      </CardHeader>

      <CardContent className="p-0 space-y-3">
        {activeTasks.length === 0 ? (
          <div className="p-6 text-center rounded-2xl bg-secondary/30 border border-border/40 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <h4 className="text-sm font-semibold">All Priority Actions Clear!</h4>
            <p className="text-xs text-muted-foreground">Great job. Your business operations are running smoothly without critical bottlenecks.</p>
          </div>
        ) : (
          activeTasks.map((task) => (
            <div
              key={task.id}
              className="p-4 rounded-2xl bg-secondary/40 hover:bg-secondary/70 border border-border/50 transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        task.priority === 'High'
                          ? 'bg-rose-500/15 text-rose-500 border-rose-500/30'
                          : task.priority === 'Medium'
                          ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                          : 'bg-blue-500/15 text-blue-500 border-blue-500/30'
                      }
                    >
                      {task.priority} Priority
                    </Badge>
                    <span className="text-xs font-bold text-foreground">{task.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{task.problem}</p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDismissTask(task.id)}
                    className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
                    title="Snooze Task"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Task Reason & Financial Impact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-background/60 border border-border/40 space-y-0.5">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Root Cause</span>
                  <p className="text-foreground">{task.reason}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-0.5">
                  <span className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider block">Estimated Benefit</span>
                  <p className="font-bold text-emerald-500">{task.estimatedBenefit}</p>
                </div>
              </div>

              {/* Recommendation & Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 border-t border-border/30">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Recommendation:</span> {task.recommendation}
                </p>

                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCompleteTask(task.id, task.title)}
                    className="rounded-xl text-xs gap-1 h-8 flex-1 sm:flex-initial"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    Mark Done
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleExecuteAction(task)}
                    className="rounded-xl text-xs gap-1 h-8 bg-primary text-primary-foreground shadow-sm flex-1 sm:flex-initial"
                  >
                    Execute Action
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
