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

    const newSupplier = {
      name,
      contactName: (formData.get('contactName') as string) || name.split(' ')[0] || 'Contact',
      email: (formData.get('email') as string) || 'supplier@example.com',
      phone: (formData.get('phone') as string) || '+1 555 0192',
      address: (formData.get('address') as string) || 'Main Hub',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await addSupplier(newSupplier);
    toast({ title: 'Supplier Created', description: `Supplier "${name}" has been added.` });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto ios-glass p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Truck className="w-5 h-5 text-primary" />
            Add New Supplier
          </DialogTitle>
          <DialogDescription className="text-xs">
            Link a new vendor or manufacturer to your supply chain.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2">
            <Label htmlFor="sup-name" className="text-left sm:text-right font-medium">Company Name *</Label>
            <Input id="sup-name" name="name" placeholder="e.g. Apex Textiles" required className="sm:col-span-3 rounded-xl" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2">
            <Label htmlFor="sup-contact" className="text-left sm:text-right font-medium">Contact Person</Label>
            <Input id="sup-contact" name="contactName" placeholder="e.g. John Doe" className="sm:col-span-3 rounded-xl" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2">
            <Label htmlFor="sup-email" className="text-left sm:text-right font-medium">Email *</Label>
            <Input id="sup-email" name="email" type="email" placeholder="orders@apex.com" required className="sm:col-span-3 rounded-xl" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2">
            <Label htmlFor="sup-phone" className="text-left sm:text-right font-medium">Phone</Label>
            <Input id="sup-phone" name="phone" placeholder="+91 98765 43210" className="sm:col-span-3 rounded-xl" />
          </div>

          <DialogFooter className="pt-3">
            <DialogClose asChild>
              <Button type="button" variant="secondary" className="rounded-xl">Cancel</Button>
            </DialogClose>
            <Button type="submit" className="rounded-xl bg-primary text-primary-foreground">Save Supplier</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
