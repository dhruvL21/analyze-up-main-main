'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useData } from '@/context/data-context';
import { useToast } from '@/hooks/use-toast';
import { Truck } from 'lucide-react';

interface AddSupplierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddSupplierModal({ open, onOpenChange }: AddSupplierModalProps) {
  const { addSupplier } = useData();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;

    if (!name || !name.trim()) return;

    const newSupplier = {
      name: name.trim(),
      contactName: (formData.get('contactName') as string)?.trim() || name.split(' ')[0] || 'Primary Contact',
      email: (formData.get('email') as string)?.trim() || 'supplier@example.com',
      phone: (formData.get('phone') as string)?.trim() || '+91 98765 43210',
      address: (formData.get('address') as string)?.trim() || 'Primary Warehouse Hub',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await addSupplier(newSupplier);
    toast({ title: 'Supplier Added', description: `Vendor "${name}" has been successfully added.` });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto ios-glass border-border/50 p-6 shadow-2xl rounded-3xl">
        <DialogHeader className="pb-2 text-left space-y-1 pr-8">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Truck className="w-5 h-5 text-primary" />
            </div>
            Add New Supplier
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Connect a manufacturer or vendor to track purchase lead times and orders.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 text-xs">
          <div className="space-y-1.5">
            <Label htmlFor="sup-name" className="font-semibold text-foreground text-xs block text-left">
              Supplier / Company Name <span className="text-primary">*</span>
            </Label>
            <Input
              id="sup-name"
              name="name"
              placeholder="e.g. Apex Manufacturing Ltd."
              required
              className="rounded-xl h-10 text-xs w-full bg-secondary/30 border-border/50 focus:border-primary/50"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sup-contact" className="font-semibold text-foreground text-xs block text-left">
              Contact Representative
            </Label>
            <Input
              id="sup-contact"
              name="contactName"
              placeholder="e.g. John Doe (Account Rep)"
              className="rounded-xl h-10 text-xs w-full bg-secondary/30 border-border/50 focus:border-primary/50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sup-email" className="font-semibold text-foreground text-xs block text-left">
                Contact Email <span className="text-primary">*</span>
              </Label>
              <Input
                id="sup-email"
                name="email"
                type="email"
                placeholder="orders@apex.com"
                required
                className="rounded-xl h-10 text-xs w-full bg-secondary/30 border-border/50 focus:border-primary/50"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sup-phone" className="font-semibold text-foreground text-xs block text-left">
                Phone Number
              </Label>
              <Input
                id="sup-phone"
                name="phone"
                placeholder="+91 98765 43210"
                className="rounded-xl h-10 text-xs w-full bg-secondary/30 border-border/50 focus:border-primary/50"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sup-address" className="font-semibold text-foreground text-xs block text-left">
              Warehouse / Hub Address
            </Label>
            <Input
              id="sup-address"
              name="address"
              placeholder="e.g. Sector 62, Logistics Hub, Noida"
              className="rounded-xl h-10 text-xs w-full bg-secondary/30 border-border/50 focus:border-primary/50"
            />
          </div>

          <DialogFooter className="pt-3 flex gap-2 justify-end">
            <DialogClose asChild>
              <Button type="button" variant="ghost" className="rounded-xl text-xs px-4 border border-border/40 hover:bg-secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs px-5 font-bold shadow-md">
              Add Supplier
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
