'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Sparkles, X, Filter } from 'lucide-react';

interface InventorySearchBarProps {
  value: string;
  onChange: (val: string) => void;
  onClear: () => void;
}

export function InventorySearchBar({ value, onChange, onClear }: InventorySearchBarProps) {
  const presetQueries = [
    { label: 'Running Out Soon', query: 'running out this week' },
    { label: 'Dead Stock', query: 'find dead stock' },
    { label: 'Highest Margins', query: 'highest margin' },
    { label: 'Low Margin (<20%)', query: 'less than 20%' },
    { label: 'Overstocked', query: 'overstocked' },
  ];

  return (
    <div className="space-y-2 text-xs">
      <div className="relative flex items-center w-full">
        <div className="absolute left-3.5 flex items-center gap-1.5 text-primary pointer-events-none">
          <Sparkles className="w-4 h-4 text-primary animate-pulse" />
        </div>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ask in natural language: e.g. 'Show products running out this week', 'Find dead stock', 'Low margin <20%'..."
          className="pl-10 pr-9 h-11 rounded-2xl border-primary/30 bg-secondary/40 text-xs shadow-inner focus-visible:ring-primary"
        />
        {value && (
          <Button
            size="icon"
            variant="ghost"
            onClick={onClear}
            className="absolute right-2 h-7 w-7 rounded-xl text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Preset NL Query Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
        <span className="text-muted-foreground font-semibold shrink-0 flex items-center gap-1">
          <Filter className="w-3 h-3 text-muted-foreground" /> Quick NL Queries:
        </span>
        {presetQueries.map((preset) => (
          <button
            key={preset.label}
            onClick={() => onChange(preset.query)}
            className={`px-2.5 py-1 rounded-xl font-medium border transition-all shrink-0 ${
              value.toLowerCase() === preset.query.toLowerCase()
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-secondary/40 border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary/80'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
