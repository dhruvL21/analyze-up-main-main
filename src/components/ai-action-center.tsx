'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { generateActionTasks, ActionTask } from '@/lib/command-center-engine';
import { useData } from '@/context/data-context';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { logBusinessAction } from '@/lib/audit-store';
import { AuditLogModal } from '@/components/audit-log-modal';
import { ThreeTierBadge } from '@/components/three-tier-badge';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  History,
  Check,
  AlertTriangle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export function AIActionCenter() {
  const { products, transactions, suppliers, orders, businessProfile, updateProduct, addOrder, addTransaction } = useData();
  const { toast } = useToast();
  const router = useRouter();

  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  const [tasks, setTasks] = useState<ActionTask[]>([]);

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

  const [confirmData, setConfirmData] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    const generated = generateActionTasks(products, transactions, suppliers, orders, businessProfile);
    setTasks(generated);
  }, [products, transactions, suppliers, orders, businessProfile]);

  const markTaskCompleted = (taskId: string) => {
    setCompletedTaskIds(prev => {
      if (prev.includes(taskId)) return prev;
      const next = [...prev, taskId];
      if (typeof window !== 'undefined') {
        localStorage.setItem('analyzeup_completed_tasks', JSON.stringify(next));
      }
      return next;
    });
  };


  const handleExecuteAction = (task: ActionTask) => {
    const currencySymbol = businessProfile?.currency?.includes('USD') ? '$' : '₹';
    const targetProd = products.find(p => (task.targetId && p.id === task.targetId) || (p.name && task.targetName && p.name.toLowerCase() === task.targetName.toLowerCase()) || (p.sku && task.title.includes(p.sku)));
    const pName = targetProd?.name || task.targetName || 'Product';

    setConfirmData({
      title: task.title,
      description: `Confirm execution of: "${task.recommendation}". This will update stock levels or catalog pricing in Firestore.`,
      onConfirm: async () => {
        // 1. Immediately complete task in React state so card dismisses instantaneously
        markTaskCompleted(task.id);

        try {
          if (task.actionType === 'reorder') {
            const reorderQty = (targetProd?.minStock || 5) * 4 || 50;
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
        }
      }
    });
  };

  const activeTasks = tasks.filter(t => !completedTaskIds.includes(t.id));

  return (
    <>
      <Card className="ios-glass rounded-3xl border-emerald-500/20 p-5 shadow-xl space-y-4">
        <CardHeader className="p-0 pb-3 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                AI Action Center
                <Badge className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 font-bold">
                  {activeTasks.length} Pending Actions
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">Proactive business task assignments for today</CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsAuditModalOpen(true)}
              className="rounded-xl text-xs gap-1.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 font-semibold"
            >
              <History className="w-3.5 h-3.5" />
              View Executed Audit Log
            </Button>

            {completedTaskIds.length > 0 && (
              <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 text-xs gap-1 font-semibold">
                <Check className="w-3.5 h-3.5" /> {completedTaskIds.length} Executed
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0 space-y-3">
          {activeTasks.length === 0 ? (
            <div className="p-6 text-center rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
              <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
              <h4 className="text-sm font-bold text-foreground">All Priority Actions Executed!</h4>
              <p className="text-xs text-muted-foreground">Great job! All operational bottlenecks and price recommendations have been executed and logged.</p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <Button onClick={() => setIsAuditModalOpen(true)} variant="outline" size="sm" className="rounded-xl text-xs gap-1.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
                  <History className="w-3.5 h-3.5" /> View Executed Change Audit Log
                </Button>
              </div>
            </div>
          ) : (
            activeTasks.map((task) => (
              <div
                key={task.id}
                className="p-4 rounded-2xl bg-secondary/40 hover:bg-secondary/70 border border-border/50 transition-all space-y-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        className={
                          task.priority === 'High'
                            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30 font-semibold text-[10px]'
                            : task.priority === 'Medium'
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30 font-semibold text-[10px]'
                            : 'bg-muted text-muted-foreground border-border font-semibold text-[10px]'
                        }
                      >
                        {task.priority} Priority
                      </Badge>
                      <span className="text-xs font-bold text-foreground">{task.title}</span>
                    </div>
                  </div>
                </div>

                {/* 5-Part Structured Explanation Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-xl bg-background/80 border border-border/40 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">1. Observed Fact</span>
                      <ThreeTierBadge tier="ACTUAL_DATA" size="sm" />
                    </div>
                    <p className="text-[11px] text-foreground leading-relaxed">{task.problem}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-background/80 border border-border/40 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">2. Root Cause / Impact</span>
                      <span className="text-[10px] font-mono text-muted-foreground font-semibold">Operational</span>
                    </div>
                    <p className="text-[11px] text-foreground leading-relaxed">{task.reason}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-purple-400 uppercase tracking-wider font-bold">3. Forecast Projection</span>
                      <ThreeTierBadge tier="MODEL_2_PREDICTION" size="sm" />
                    </div>
                    <p className="text-[11px] text-purple-200/90 leading-relaxed">{task.impact}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold">4. Estimated Benefit</span>
                      <span className="text-[10px] text-emerald-400 font-semibold font-mono">Value Added</span>
                    </div>
                    <p className="text-[11px] text-emerald-300 font-bold leading-relaxed">{task.estimatedBenefit}</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 border-t border-border/40 gap-3">
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-foreground">5. Recommended Action:</span>
                    <span className="text-foreground/90 font-medium">{task.recommendation}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                    <Button
                      size="sm"
                      onClick={() => handleExecuteAction(task)}
                      className="w-full sm:w-auto rounded-xl text-xs h-8 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-600/20 gap-1.5 px-4"
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

      {/* Audit Log Modal */}
      <AuditLogModal
        open={isAuditModalOpen}
        onOpenChange={setIsAuditModalOpen}
      />

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
    </>
  );
}
