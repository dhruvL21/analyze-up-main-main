'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Boxes, ShoppingCart, RefreshCw } from 'lucide-react';
import { useData } from '@/context/data-context';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function OperationsSubNav() {
  const pathname = usePathname();
  const { products = [], transactions = [], orders = [], returns = [] } = useData();

  // Strict count calculations:
  // - Customer Sales transactions: type === 'Sale'
  // - Purchase Orders: orders.length
  const salesCount = transactions.filter(t => t.type === 'Sale').length;
  const ordersCount = orders.length;
  const totalOrdersAndSales = ordersCount + salesCount;
  const returnsCount = returns.length;

  const tabs = [
    {
      label: 'Inventory Stock',
      href: '/dashboard/inventory',
      icon: Boxes,
      count: products.length,
    },
    {
      label: 'Orders & Sales',
      href: '/dashboard/orders',
      icon: ShoppingCart,
      count: totalOrdersAndSales,
    },
    {
      label: 'Customer Returns',
      href: '/dashboard/returns',
      icon: RefreshCw,
      count: returnsCount,
    },
  ];

  return (
    <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-secondary/50 border border-border/40 w-fit overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        const Icon = tab.icon;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all shrink-0',
              isActive
                ? 'bg-primary/15 text-primary border border-primary/30 shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
            )}
          >
            <Icon className="w-4 h-4" />
            <span>{tab.label}</span>
            <Badge
              variant="outline"
              className={cn(
                'text-[11px] px-1.5 py-0 font-mono border-0',
                isActive ? 'bg-primary/20 text-primary font-bold' : 'bg-secondary text-muted-foreground'
              )}
            >
              {tab.count}
            </Badge>
          </Link>
        );
      })}
    </div>
  );
}
