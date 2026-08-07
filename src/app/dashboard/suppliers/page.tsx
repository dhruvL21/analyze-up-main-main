
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { PlusCircle, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useData } from '@/context/data-context';
import { AddSupplierModal } from '@/components/add-supplier-modal';


export default function SuppliersPage() {
  const { suppliers, products, addSupplier, deleteSupplier, isLoading } = useData();
  const [dialogOpen, setDialogOpen] = useState(false);

  const supplierProductCount = useMemo(() => {
    const count: { [key: string]: number } = {};
    suppliers.forEach(supplier => {
      count[supplier.id] = products.filter(p => p.supplierId === supplier.id).length;
    });
    return count;
  }, [suppliers, products]);

  useEffect(() => {
    if (isLoading || suppliers.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        root: null,
        threshold: 0.1,
        rootMargin: "0px 0px -10% 0px"
      }
    );

    const items = document.querySelectorAll(".scroll-reveal-item");
    items.forEach(el => observer.observe(el));

    return () => items.forEach(el => observer.unobserve(el));
  }, [suppliers, isLoading]);



  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-center">
          <h1 className="text-lg font-semibold md:text-2xl">Suppliers</h1>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              className="h-8 gap-1"
              onClick={() => setDialogOpen(true)}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Add Supplier
              </span>
            </Button>
          </div>
        </div>
        <div className="relative">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {suppliers.map((supplier) => (
                <Card key={supplier.id} className="scroll-reveal-item">
                <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                    <CardTitle>{supplier.name}</CardTitle>
                    <CardDescription>{supplier.email}</CardDescription>
                    </div>
                    <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                        aria-haspopup="true"
                        size="icon"
                        variant="ghost"
                        >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel className="bg-primary/10 text-primary text-[10px] uppercase tracking-wider font-bold text-center py-1 rounded-sm mb-1 select-none">Actions</DropdownMenuLabel>
                        <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()}
                            className="text-destructive"
                            >
                            Delete
                            </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="w-[95vw] sm:max-w-md rounded-xl">
                            <AlertDialogHeader>
                            <AlertDialogTitle>
                                Are you sure?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will
                                permanently delete the supplier and may affect related products.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => deleteSupplier(supplier.id)}
                            >
                                Delete
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                        </AlertDialog>
                    </DropdownMenuContent>
                    </DropdownMenu>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                    Supplies{' '}
                    <span className="font-semibold">
                        {supplierProductCount[supplier.id] || 0}
                    </span>{' '}
                    product(s).
                    </p>
                </CardContent>
                </Card>
            ))}
            </div>
        </div>
      </div>

      <AddSupplierModal open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
