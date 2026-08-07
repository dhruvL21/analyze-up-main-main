import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BotIcon, ZapIcon, BarChartIcon, TrendingUp, Package, Scale, RefreshCw } from 'lucide-react';
import { AnimatedHero } from '@/components/animated-hero';
import { AnalyzeUpIcon } from '@/components/analyze-up-icon';
import { RotatingText } from '@/components/rotating-text';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-[100dvh] bg-background text-foreground relative overflow-hidden">
      {/* Floating E-commerce Background Elements (Desktop only) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 hidden xl:block">
        {/* Glow Blobs */}
        <div className="absolute top-[15%] left-[10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute top-[35%] right-[5%] w-[600px] h-[600px] rounded-full bg-purple-500/5 blur-[150px]" />
        <div className="absolute top-[55%] left-[8%] w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-[120px]" />
        <div className="absolute top-[75%] right-[10%] w-[550px] h-[550px] rounded-full bg-primary/5 blur-[130px]" />
        <div className="absolute top-[90%] left-[12%] w-[400px] h-[400px] rounded-full bg-purple-500/5 blur-[110px]" />

        {/* Floating Card 1: Stock Alert (Left - top 22%) */}
        <div className="absolute left-[3%] top-[22%] w-60 p-4 rounded-xl border border-border/40 bg-card/30 backdrop-blur-sm -rotate-6 shadow-2xl opacity-45 hover:opacity-90 transition-all duration-500">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500/90">Low Stock Alert</span>
          </div>
          <p className="text-xs font-bold text-foreground">Classic White Tee</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">8 units remaining (Runway: 3 days)</p>
        </div>

        {/* Floating Card 2: New Sale (Right - top 28%) */}
        <div className="absolute right-[3%] top-[28%] w-56 p-4 rounded-xl border border-border/40 bg-card/30 backdrop-blur-sm rotate-6 shadow-2xl opacity-45 hover:opacity-90 transition-all duration-500">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Order Completed</span>
            <span className="text-xs font-bold text-emerald-400">+₹4,500</span>
          </div>
          <div className="h-1.5 w-full bg-secondary/50 rounded-full overflow-hidden">
            <div className="h-full w-3/4 bg-emerald-500 rounded-full" />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">SKU: TS-002 • Qty: 3</p>
        </div>

        {/* Floating Card 3: Margin Analyst (Left - top 44%) */}
        <div className="absolute left-[4%] top-[44%] w-56 p-4 rounded-xl border border-border/40 bg-card/30 backdrop-blur-sm rotate-3 shadow-2xl opacity-40 hover:opacity-90 transition-all duration-500">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Profit Margin</span>
          </div>
          <p className="text-xs font-bold text-foreground">Gross Margin: 68%</p>
          <p className="text-[11px] text-emerald-400 mt-0.5">Healthy (Industry avg: 55%)</p>
        </div>

        {/* Floating Card 4: Supplier Risk (Right - top 52%) */}
        <div className="absolute right-[4%] top-[52%] w-60 p-4 rounded-xl border border-border/40 bg-card/30 backdrop-blur-sm -rotate-6 shadow-2xl opacity-40 hover:opacity-90 transition-all duration-500">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Supplier Risk</span>
            <span className="text-[10px] font-semibold text-amber-500">PO Delayed</span>
          </div>
          <p className="text-xs font-bold text-foreground">Apex Electronics</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Average lead time increased to 12 days.</p>
        </div>

        {/* Floating Card 5: Return Processed (Left - top 68%) */}
        <div className="absolute left-[4%] top-[68%] w-64 p-4 rounded-xl border border-border/40 bg-card/30 backdrop-blur-sm rotate-3 shadow-2xl opacity-35 hover:opacity-90 transition-all duration-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Return Logged</span>
            <span className="text-xs font-bold text-primary">-₹1,999</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center text-[10px] text-primary font-bold">R</div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate text-foreground">Waterproof Backpack</p>
              <p className="text-[10px] text-muted-foreground">Reason: Wrong Size • Restocked</p>
            </div>
          </div>
        </div>

        {/* Floating Card 6: Supplier Restock (Right - top 76%) */}
        <div className="absolute right-[4%] top-[76%] w-60 p-4 rounded-xl border border-border/40 bg-card/30 backdrop-blur-sm -rotate-3 shadow-2xl opacity-35 hover:opacity-90 transition-all duration-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Fulfillment</span>
            <span className="text-[10px] text-purple-400 font-semibold">PO #4029</span>
          </div>
          <p className="text-xs font-bold text-foreground">50 Units Received</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Supplier: Zenith Textiles</p>
          <div className="mt-2 h-1 bg-purple-500/30 rounded-full w-full">
            <div className="h-full bg-purple-500 rounded-full w-full" />
          </div>
        </div>
      </div>
      <header className="px-4 lg:px-6 h-16 flex items-center justify-between sticky top-0 z-50 bg-background/70 backdrop-blur-xl border-b">
        <Link href="/" className="flex items-center justify-center shrink-0">
          <AnalyzeUpIcon className="h-6 w-6 text-primary" />
          <span className="ml-2 font-semibold text-xl">AnalyzeUp</span>
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex ml-auto gap-4 lg:gap-6 items-center">
          <Link
            href="#features"
            className="text-sm font-medium hover:text-primary transition-colors text-muted-foreground"
          >
            Features
          </Link>
          <Link href="/login">
            <Button variant="ghost">Sign In</Button>
          </Link>
          <Link href="/register">
            <Button>Get Started</Button>
          </Link>
        </nav>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center gap-2">
            <Link href="/login">
                <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
        </div>
      </header>
      <main className="flex-1">
        <section className="w-full pt-12 pb-20 md:pt-16 md:pb-24 lg:pt-20 lg:pb-32 animated-grid-background overflow-hidden">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid grid-cols-[1fr_100px] min-[400px]:grid-cols-[1fr_130px] sm:grid-cols-[1.2fr_0.8fr] lg:grid-cols-[1fr_500px] gap-4 md:gap-12 items-center">
              <div className="flex flex-col justify-center space-y-6 text-left">
                <div className="space-y-4">
                  <h1 className="text-2xl min-[400px]:text-3xl sm:text-4xl md:text-6xl xl:text-7xl/none text-foreground font-bold tracking-tighter">
                    An AI Copilot for <br /> <RotatingText />
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground text-sm min-[400px]:text-base md:text-xl">
                    Know what to reorder, what is being returned, and where you’re losing money.
                  </p>
                </div>
                <div className="flex flex-row gap-3 justify-start">
                  <Link
                    href="/register"
                    className="w-auto"
                  >
                    <Button size="lg" className="px-4 sm:px-8 text-xs min-[400px]:text-sm sm:text-base">Get Started Free</Button>
                  </Link>
                  <Link
                    href="#features"
                    className="w-auto"
                  >
                    <Button size="lg" variant="secondary" className="px-4 sm:px-8 text-xs min-[400px]:text-sm sm:text-base">Learn More</Button>
                  </Link>
                </div>
              </div>
              <div className="flex items-center justify-center lg:order-last min-h-[200px] lg:min-h-[400px]">
                  <AnimatedHero />
              </div>
            </div>
          </div>
        </section>

        {/* Mobile Premium Glow Divider */}
        <div className="relative w-full h-[1px] block md:hidden z-10">
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-[16px] bg-primary/20 rounded-full blur-[6px]" />
        </div>

        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-3">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Built for Ambitious Brands</h2>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Stop juggling spreadsheets and start making intelligent decisions. AnalyzeUp is the all-in-one platform for e-commerce stores and growing businesses that need to move faster.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3 lg:gap-16 mt-12">
              <div className="grid gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center rounded-lg bg-primary/10 p-3 text-primary">
                    <Package className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold">Streamline Operations</h3>
                </div>
                <p className="text-muted-foreground">
                  Centralize your inventory, orders, and suppliers. Reduce manual errors and save hours of administrative work every week.
                </p>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center rounded-lg bg-primary/10 p-3 text-primary">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold">Data-Driven Decisions</h3>
                </div>
                <p className="text-muted-foreground">
                  Get real-time insights into your sales trends, best-performing products, and inventory value to capitalize on opportunities.
                </p>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center rounded-lg bg-primary/10 p-3 text-primary">
                    <Scale className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold">Scale with Confidence</h3>
                </div>
                <p className="text-muted-foreground">
                  With AI-powered demand forecasting and strategic advice, you'll have the tools you need to grow your business sustainably.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Mobile Premium Glow Divider */}
        <div className="relative w-full h-[1px] block md:hidden z-10">
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-[16px] bg-primary/20 rounded-full blur-[6px]" />
        </div>

        <section
          id="features"
          className="w-full py-12 md:py-24 lg:py-32"
        >
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-full bg-secondary px-3 py-1 text-sm font-medium">
                  Key Features
                </div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-foreground">
                  Everything You Need to Succeed
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Our platform is packed with features to help you manage your
                  inventory efficiently, gain valuable insights, and grow your
                  business.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-8 py-12 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
              <div className="grid gap-2">
                 <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center rounded-lg bg-primary/10 p-3 text-primary">
                    <BotIcon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold">AI-Powered Insights</h3>
                </div>
                <p className="text-muted-foreground">
                  Leverage artificial intelligence to get smart reorder
                  suggestions, generate product descriptions, and analyze market
                  trends.
                </p>
              </div>
               <div className="grid gap-2">
                 <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center rounded-lg bg-primary/10 p-3 text-primary">
                    <ZapIcon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold">Real-Time Tracking</h3>
                </div>
                <p className="text-muted-foreground">
                  Monitor your stock levels, sales, and orders in real-time
                  from anywhere. Never miss a beat with our synchronized
                  dashboard.
                </p>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center gap-3">
                   <div className="flex items-center justify-center rounded-lg bg-primary/10 p-3 text-primary">
                    <BarChartIcon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold">Comprehensive Reports</h3>
                </div>
                <p className="text-muted-foreground">
                  Generate detailed reports on sales, inventory value, and top-performing products to make informed business decisions.
                </p>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center gap-3">
                   <div className="flex items-center justify-center rounded-lg bg-primary/10 p-3 text-primary">
                    <RefreshCw className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold">Returns Management</h3>
                </div>
                <p className="text-muted-foreground">
                  Easily track returned orders, auto-recalculate return rates, handle restocking, and adjust sales metrics automatically.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} AnalyzeUp. All rights reserved.
        </p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link
            href="#"
            className="text-xs hover:underline underline-offset-4 text-muted-foreground"
          >
            Terms of Service
          </Link>
          <Link
            href="#"
            className="text-xs hover:underline underline-offset-4 text-muted-foreground"
          >
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}
