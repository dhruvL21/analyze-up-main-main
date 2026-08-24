'use client';

import React, { useState, useEffect } from 'react';
import { PlusCircle, MoreHorizontal, AlertCircle, Search, CheckCircle, Calendar, DollarSign, ClipboardList, Activity, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useData } from '@/context/data-context';
import { useToast } from '@/hooks/use-toast';
import { OperationsSubNav } from '@/components/operations-sub-nav';

export default function ReturnsPage() {
  const { returns, products, transactions, addReturn, deleteReturn, updateReturnStatus, isLoading } = useData();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [reasonFilter, setReasonFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Log Form State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState('');
  const [reason, setReason] = useState<'Defective' | 'Wrong Item' | 'Unopened / Buyer Remorse' | 'Damaged in Transit' | 'Other'>('Unopened / Buyer Remorse');
  const [actionTaken, setActionTaken] = useState<'Restocked' | 'Disposed / Written Off'>('Restocked');
  const [refundStatus, setRefundStatus] = useState<'Refunded' | 'Store Credit' | 'Pending' | 'Rejected'>('Refunded');
  const [refundAmount, setRefundAmount] = useState(0);
  const [notes, setNotes] = useState('');

  // Auto-calculate suggested refund amount when product or quantity changes
  useEffect(() => {
    if (!selectedProductId) {
      setRefundAmount(0);
      return;
    }
    const product = products.find(p => p.id === selectedProductId);
    if (product) {
      setRefundAmount(product.price * quantity);
    }
  }, [selectedProductId, quantity, products]);

  // Scroll reveal animation trigger
  useEffect(() => {
    if (isLoading || returns.length === 0) return;

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
  }, [returns, isLoading]);

  // Stats Calculations
  const stats = React.useMemo(() => {
    const totalReturnsCount = returns.length;
    
    // Total Items Sold
    const totalItemsSold = transactions
      .filter(t => t.type === 'Sale' && t.quantity > 0)
      .reduce((sum, t) => sum + t.quantity, 0) || 1; // avoid division by zero

    // Total Returned Quantity
    const totalReturnedQuantity = returns.reduce((sum, r) => sum + r.quantity, 0);

    // Return Rate: returned items / total items sold
    const returnRate = (totalReturnedQuantity / totalItemsSold) * 100;

    // Total Refunded Issued
    const totalRefunded = returns
      .filter(r => r.refundStatus === 'Refunded' || r.refundStatus === 'Store Credit')
      .reduce((sum, r) => sum + r.refundAmount, 0);

    // Damaged Goods Written-off Value (calculate cost basis)
    const writeOffValue = returns
      .filter(r => r.actionTaken === 'Disposed / Written Off')
      .reduce((sum, r) => {
        const product = products.find(p => p.id === r.productId);
        const costBasis = product?.costPrice || (product?.price ? product.price * 0.6 : 0);
        return sum + (r.quantity * costBasis);
      }, 0);

    return {
      totalReturnsCount,
      totalReturnedQuantity,
      returnRate,
      totalRefunded,
      writeOffValue
    };
  }, [returns, transactions, products]);

  // Reason Breakdown for Analytics
  const reasonBreakdown = React.useMemo(() => {
    const counts = {
      'Defective': 0,
      'Wrong Item': 0,
      'Unopened / Buyer Remorse': 0,
      'Damaged in Transit': 0,
      'Other': 0
    };
    
    returns.forEach(r => {
      if (counts[r.reason] !== undefined) {
        counts[r.reason] += r.quantity;
      }
    });

    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(counts).map(([name, qty]) => ({
      name,
      qty,
      percentage: Math.round((qty / total) * 100)
    })).sort((a, b) => b.qty - a.qty);
  }, [returns]);

  // Quality Control Alerts (Products with Return Rate > 10% or High return count)
  const qualityAlerts = React.useMemo(() => {
    const productReturnMap: Record<string, { name: string; returned: number; sold: number; supplierId?: string }> = {};

    returns.forEach(r => {
      if (!productReturnMap[r.productId]) {
        const p = products.find(prod => prod.id === r.productId);
        productReturnMap[r.productId] = {
          name: r.productName,
          returned: 0,
          sold: 0,
          supplierId: p?.supplierId
        };
      }
      productReturnMap[r.productId].returned += r.quantity;
    });

    // Populate sold counts
    transactions.filter(t => t.type === 'Sale' && t.quantity > 0).forEach(t => {
      if (t.productId && productReturnMap[t.productId]) {
        productReturnMap[t.productId].sold += t.quantity;
      }
    });

    return Object.entries(productReturnMap)
      .map(([id, info]) => {
        const rate = info.sold > 0 ? (info.returned / (info.sold + info.returned)) * 100 : 100;
        return {
          id,
          name: info.name,
          returned: info.returned,
          sold: info.sold,
          rate,
          supplierId: info.supplierId
        };
      })
      .filter(item => item.returned >= 3 && item.rate > 8) // trigger when return counts are meaningful and rate is high
      .sort((a, b) => b.rate - a.rate);
  }, [returns, transactions, products]);

  // Filtered Returns (Safe against undefined properties)
  const filteredReturns = (returns || []).filter(r => {
    if (!r) return false;
    const query = (searchQuery || '').toLowerCase().trim();
    const matchesSearch = !query ||
      (r.customerName || '').toLowerCase().includes(query) ||
      (r.productName || '').toLowerCase().includes(query) ||
      (r.id || '').toLowerCase().includes(query);
      
    const matchesReason = reasonFilter === 'all' || r.reason === reasonFilter;
    const matchesStatus = statusFilter === 'all' || r.refundStatus === statusFilter;

    return matchesSearch && matchesReason && matchesStatus;
  });

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedProductId) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please select a product.'
      });
      return;
    }

    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    const returnData = {
      productId: selectedProductId,
      productName: product.name,
      quantity,
      customerName,
      reason,
      actionTaken,
      refundStatus,
      refundAmount,
      returnDate: new Date().toISOString(),
      notes
    };

    await addReturn(returnData);
    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedProductId('');
    setQuantity(1);
    setCustomerName('');
    setReason('Unopened / Buyer Remorse');
    setActionTaken('Restocked');
    setRefundStatus('Refunded');
    setRefundAmount(0);
    setNotes('');
  };

  return (
    <>
      <div className="flex flex-col gap-8">
        <OperationsSubNav />
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold md:text-3xl tracking-tight">Returns Management</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Process customer returns, adjust stocks automatically, track refunds, and monitor product quality.
            </p>
          </div>
          <Button size="sm" onClick={() => setIsDialogOpen(true)} className="sm:self-center self-start gap-1.5 shadow-sm">
            <PlusCircle className="h-4 w-4" />
            Log Returned Order
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="scroll-reveal-item relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Returns</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalReturnsCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalReturnedQuantity} items returned by customers
              </p>
            </CardContent>
          </Card>

          <Card className="scroll-reveal-item relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Return Rate</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.returnRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                Percent of total items sold returned
              </p>
            </CardContent>
          </Card>

          <Card className="scroll-reveal-item relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Refunds Issued</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                ₹{stats.totalRefunded.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Refunds & store credits processed
              </p>
            </CardContent>
          </Card>

          <Card className="scroll-reveal-item relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Write-Off Losses</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                ₹{stats.writeOffValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Value of disposed/damaged stock
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quality Alerts (if any) */}
        {qualityAlerts.length > 0 && (
          <Card className="border-amber-500/20 bg-amber-500/5 scroll-reveal-item">
            <CardHeader className="pb-3 flex flex-row items-start gap-4">
              <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl shrink-0">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base text-amber-800 dark:text-amber-300">Product Quality Alerts Detected</CardTitle>
                <CardDescription className="text-amber-700/80 dark:text-amber-400/80">
                  The following items have unusually high customer return rates. Review specifications or check with suppliers to prevent stock losses.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {qualityAlerts.map(alert => (
                  <div key={alert.id} className="p-3.5 bg-background/50 backdrop-blur-sm rounded-xl border border-amber-500/10 flex flex-col justify-between">
                    <div>
                      <p className="font-semibold text-sm truncate">{alert.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="destructive" className="text-[10px] py-0 px-1.5 bg-destructive/10 text-destructive border-destructive/20">
                          Return Rate: {alert.rate.toFixed(1)}%
                        </Badge>
                        <span className="text-xs text-muted-foreground">{alert.returned} returned / {alert.sold} sold</span>
                      </div>
                    </div>
                    {alert.supplierId && (
                      <p className="text-[11px] text-muted-foreground mt-3 italic">
                        Supplied by: {products.find(p => p.id === alert.id)?.supplierId ? 'Assigned Supplier' : 'Unknown'}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Grid: Returns History & Analytics */}
        <div className="grid gap-8 grid-cols-1 xl:grid-cols-3 items-start">
          {/* Returns Log */}
          <Card className="xl:col-span-2 scroll-reveal-item">
            <CardHeader className="pb-4">
              <CardTitle>Returned Orders Log</CardTitle>
              <CardDescription>View, search, and update details for customer returns.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Search & Filters */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between mb-4">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by customer, product..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Select value={reasonFilter} onValueChange={setReasonFilter}>
                    <SelectTrigger className="h-9 w-full sm:w-[140px]">
                      <SelectValue placeholder="All Reasons" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Reasons</SelectItem>
                      <SelectItem value="Defective">Defective</SelectItem>
                      <SelectItem value="Wrong Item">Wrong Item</SelectItem>
                      <SelectItem value="Unopened / Buyer Remorse">Remorse</SelectItem>
                      <SelectItem value="Damaged in Transit">Transit Damage</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9 w-full sm:w-[140px]">
                      <SelectValue placeholder="All Refunds" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="Refunded">Refunded</SelectItem>
                      <SelectItem value="Store Credit">Store Credit</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Refund</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-[80px]"><span className="sr-only">Actions</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReturns.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground select-none">
                          No returns matching filters found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredReturns.map((item) => (
                        <TableRow key={item.id} className="hover:bg-muted/10 transition-colors">
                          <TableCell className="font-medium">
                            <div>
                              <p className="text-sm font-semibold">{item.customerName}</p>
                              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Calendar className="h-3 w-3" />
                                {new Date(item.returnDate).toLocaleDateString()}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium">{item.productName}</p>
                              <span className="text-[10px] text-muted-foreground bg-secondary/30 px-1 py-0.5 rounded">
                                {item.reason}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-bold text-sm">
                            {item.quantity}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={item.actionTaken === 'Restocked' ? 'outline' : 'destructive'}
                              className={item.actionTaken === 'Restocked' ? 'border-primary/20 text-primary bg-primary/5' : ''}
                            >
                              {item.actionTaken === 'Restocked' ? 'Restocked' : 'Disposed'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                item.refundStatus === 'Refunded'
                                  ? 'secondary'
                                  : item.refundStatus === 'Store Credit'
                                  ? 'outline'
                                  : item.refundStatus === 'Pending'
                                  ? 'default'
                                  : 'destructive'
                              }
                            >
                              {item.refundStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-sm">
                            ₹{item.refundAmount.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost" className="rounded-full h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Toggle menu</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel className="bg-primary/10 text-primary text-[10px] uppercase font-bold text-center py-1 mb-1">Actions</DropdownMenuLabel>
                                {item.refundStatus === 'Pending' && (
                                  <>
                                    <DropdownMenuItem onClick={() => updateReturnStatus(item.id, 'Refunded')} className="text-primary font-medium">
                                      Issue Refund
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => updateReturnStatus(item.id, 'Store Credit')}>
                                      Issue Store Credit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => updateReturnStatus(item.id, 'Rejected')} className="text-destructive">
                                      Reject Refund
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                      Delete Log
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="w-[95vw] sm:max-w-md rounded-xl">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently remove the returns transaction record. It will NOT undo any changes made to product inventory.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => deleteReturn(item.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Return Analytics Sidebar */}
          <div className="flex flex-col gap-8">
            {/* Reason Breakdown */}
            <Card className="scroll-reveal-item">
              <CardHeader>
                <CardTitle>Return Reasons Breakdown</CardTitle>
                <CardDescription>Weekly return volume breakdown by reason.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {returns.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground border border-dashed rounded-lg">
                    No returns logged yet.
                  </div>
                ) : (
                  reasonBreakdown.map((item, index) => (
                    <div key={index} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="truncate">{item.name}</span>
                        <span className="text-muted-foreground">{item.qty} units ({item.percentage}%)</span>
                      </div>
                      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Fulfill Policy Summary */}
            <Card className="scroll-reveal-item bg-muted/20 border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  Small Business Policy Guide
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-3 text-muted-foreground">
                <p>
                  <strong>Restock:</strong> Select this for unopened products or items with size issues. This adds the item directly back into stock.
                </p>
                <p>
                  <strong>Dispose / Write-Off:</strong> Select this for damaged or defective returns. Keeps stock level unaffected and records product loss.
                </p>
                <p>
                  <strong>Refund Actions:</strong> Fulfilling a refund logs a negative sales entry which automatically adjusts monthly revenue figures on the analytics dashboards.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Log Return Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
        setIsDialogOpen(isOpen);
        if(!isOpen) resetForm();
      }}>
        <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto ios-glass">
          <DialogHeader>
            <DialogTitle>Log Return Transaction</DialogTitle>
            <DialogDescription>Record a product return and trigger inventory adjustments.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="grid gap-4 py-3">
            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-3">
              <Label htmlFor="productId" className="sm:text-right text-xs font-semibold">Product</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId} required>
                <SelectTrigger className="sm:col-span-3 text-sm">
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map(prod => (
                    <SelectItem key={prod.id} value={prod.id}>
                      {prod.name} (Stock: {prod.stock})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-3">
              <Label htmlFor="customerName" className="sm:text-right text-xs font-semibold">Customer</Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. John Doe"
                className="sm:col-span-3"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-3">
              <Label htmlFor="quantity" className="sm:text-right text-xs font-semibold">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="sm:col-span-3"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-3">
              <Label htmlFor="reason" className="sm:text-right text-xs font-semibold">Reason</Label>
              <Select value={reason} onValueChange={(val: any) => setReason(val)}>
                <SelectTrigger className="sm:col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Defective">Defective</SelectItem>
                  <SelectItem value="Wrong Item">Wrong Item / Size</SelectItem>
                  <SelectItem value="Unopened / Buyer Remorse">Buyer Remorse / Unopened</SelectItem>
                  <SelectItem value="Damaged in Transit">Damaged in Transit</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-3">
              <Label htmlFor="actionTaken" className="sm:text-right text-xs font-semibold">Action</Label>
              <Select value={actionTaken} onValueChange={(val: any) => setActionTaken(val)}>
                <SelectTrigger className="sm:col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Restocked">Restock & resell item</SelectItem>
                  <SelectItem value="Disposed / Written Off">Dispose / Damaged write-off</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-3">
              <Label htmlFor="refundStatus" className="sm:text-right text-xs font-semibold">Refund Status</Label>
              <Select value={refundStatus} onValueChange={(val: any) => setRefundStatus(val)}>
                <SelectTrigger className="sm:col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Refunded">Refunded (Cash/UPI/Card)</SelectItem>
                  <SelectItem value="Store Credit">Store Credit</SelectItem>
                  <SelectItem value="Pending">Pending Approval</SelectItem>
                  <SelectItem value="Rejected">Rejected (No Refund)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-3">
              <Label htmlFor="refundAmount" className="sm:text-right text-xs font-semibold">Refund (₹)</Label>
              <Input
                id="refundAmount"
                type="number"
                min="0"
                step="0.01"
                value={refundAmount}
                onChange={(e) => setRefundAmount(Number(e.target.value))}
                className="sm:col-span-3"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-3">
              <Label htmlFor="notes" className="sm:text-right text-xs font-semibold pt-1">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Details about product defects or sizing details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="sm:col-span-3 min-h-[60px]"
              />
            </div>

            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button type="button" variant="secondary">Cancel</Button>
              </DialogClose>
              <Button type="submit">Log Return</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
