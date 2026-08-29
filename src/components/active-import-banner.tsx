'use client';

import React from 'react';
import { useImportJob } from '@/hooks/use-import-job';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Database, AlertCircle, CheckCircle2, X } from 'lucide-react';

export function ActiveImportBanner() {
  const { activeJob, cancelJob, clearActiveJob } = useImportJob();

  if (!activeJob) return null;

  const isOngoing =
    activeJob.status === 'QUEUED' ||
    activeJob.status === 'VALIDATING' ||
    activeJob.status === 'IMPORTING' ||
    activeJob.status === 'PROCESSING';

  const isComplete = activeJob.status === 'COMPLETED' || activeJob.status === 'COMPLETED_WITH_ERRORS';
  const isFailed = activeJob.status === 'FAILED';

  // Auto-dismiss completed banners after user closes them
  if (!isOngoing && !isComplete && !isFailed) return null;

  return (
    <aside aria-label="Dataset Import Status" className="sticky top-16 z-40 px-4 py-2.5 bg-background/85 backdrop-blur-xl border-b border-primary/20 shadow-lg transition-all animate-in fade-in slide-in-from-top-2">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 border border-primary/20">
            {isOngoing ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            ) : isComplete ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-foreground truncate max-w-[200px] sm:max-w-xs">
                {activeJob.fileName || 'Dataset Import'}
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 font-semibold ${
                  isOngoing
                    ? 'bg-primary/10 text-primary border-primary/30 animate-pulse'
                    : isComplete
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}
              >
                {activeJob.status.replace(/_/g, ' ')}
              </Badge>
              <span className="text-[11px] text-muted-foreground">
                {activeJob.processedRecords?.toLocaleString() || 0} / {activeJob.totalRecords?.toLocaleString() || 0} records
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Progress value={activeJob.progress || 0} className="h-1.5 flex-1 max-w-md bg-secondary" />
              <span className="text-[11px] font-mono font-bold text-primary shrink-0">
                {activeJob.progress || 0}%
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          {isOngoing ? (
            <>
              <span className="text-[10px] text-muted-foreground hidden md:inline">
                Processing in background — safe to navigate
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => cancelJob(activeJob.id)}
                className="h-7 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg px-2.5"
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={clearActiveJob}
              className="h-7 text-xs rounded-lg px-2.5 border-border/60"
            >
              <X className="w-3.5 h-3.5 mr-1" /> Dismiss
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
}
