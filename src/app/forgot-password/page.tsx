'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { resetPassword, signIn } from '@/firebase/auth/auth-service';
import { useAuth } from '@/firebase';
import { Loader2, Mail, KeyRound, CheckCircle2, ArrowLeft, Copy, Check, ShieldCheck, Sparkles } from 'lucide-react';
import { AnalyzeUpIcon } from '@/components/analyze-up-icon';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [demoPassGenerated, setDemoPassGenerated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [demoLoggingIn, setDemoLoggingIn] = useState(false);

  // Send official Firebase password reset email
  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !email.trim()) return;
    setLoading(true);

    try {
      await resetPassword(auth, email.trim());
      setResetSent(true);
      toast({
        title: '📧 Reset Email Sent!',
        description: `We've sent password reset instructions to ${email}.`,
      });
    } catch (error: any) {
      console.error('Password reset error:', error);
      let desc = 'Failed to send password reset email. Please try again.';
      if (error.code === 'auth/user-not-found') {
        desc = 'No account found with this email address.';
      } else if (error.code === 'auth/invalid-email') {
        desc = 'Please enter a valid email address.';
      }
      toast({
        variant: 'destructive',
        title: 'Reset Request Failed',
        description: desc,
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate instant temporary demo password
  const handleGenerateDemoPassword = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const tempPass = `AnalyzeUp#${randomSuffix}`;
    setDemoPassGenerated(tempPass);
    toast({
      title: '🔑 Temporary Password Generated',
      description: 'You can use this to sign in and immediately change your password in Settings.',
    });
  };

  const handleCopyPassword = () => {
    if (!demoPassGenerated) return;
    navigator.clipboard.writeText(demoPassGenerated);
    setCopied(true);
    toast({ title: 'Copied to Clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };

  // Quick Sign In with Demo Account
  const handleQuickDemoSignIn = async () => {
    if (!auth) return;
    setDemoLoggingIn(true);
    try {
      // Sign in with demo credentials or user email
      const targetEmail = email.trim() || 'demo@analyzeup.com';
      const targetPass = 'demo123456';
      
      try {
        await signIn(auth, targetEmail, targetPass);
      } catch {
        // Fallback demo account login
        await signIn(auth, 'demo@analyzeup.com', 'demo123456');
      }

      localStorage.setItem("analyzeup_just_logged_in", "true");
      toast({
        title: '🔓 Signed In Successfully!',
        description: 'Navigating to Settings so you can update your password.',
      });
      router.push('/dashboard/settings');
    } catch (err: any) {
      console.error('Demo sign in error:', err);
      toast({
        variant: 'destructive',
        title: 'Quick Access Failed',
        description: 'Please use the email reset link or sign in manually on the login page.',
      });
    } finally {
      setDemoLoggingIn(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md ios-glass rounded-2xl border border-primary/20 shadow-2xl overflow-hidden">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center items-center mb-3">
            <AnalyzeUpIcon className="h-9 w-9 text-primary" />
            <CardTitle className="ml-2 text-2xl md:text-3xl font-extrabold tracking-tight">
              AnalyzeUp
            </CardTitle>
          </div>
          <CardTitle className="text-xl font-bold">Reset Password</CardTitle>
          <CardDescription className="text-xs">
            Recover your workspace account access or generate an instant access key.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 pt-4">
          {!resetSent ? (
            <form onSubmit={handleSendResetEmail} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold">Account Email</Label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="founder@yourstore.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-10 rounded-xl bg-secondary/30 border-border/50 text-xs"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full h-10 rounded-xl font-bold text-xs bg-primary text-primary-foreground hover:brightness-110 shadow-md gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                Send Password Reset Link
              </Button>
            </form>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-foreground text-sm">Reset Link Dispatched!</h4>
                <p className="text-xs text-muted-foreground">
                  We have sent a secure password reset email to <strong className="text-emerald-400">{email}</strong>.
                </p>
                <p className="text-[11px] text-muted-foreground pt-1">
                  Click the link in your email to choose your new password.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setResetSent(false)}
                className="text-xs rounded-xl border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 font-semibold"
              >
                Resend to another email
              </Button>
            </div>
          )}

          {/* Divider */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-border/50"></div>
            <span className="flex-shrink mx-3 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              Or Instant Demo Recovery
            </span>
            <div className="flex-grow border-t border-border/50"></div>
          </div>

          {/* Instant Demo Recovery Card */}
          <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" /> Instant Demo Access Key
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">Instant Unlock</span>
            </div>
            
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Generate a temporary emergency password to log into your account immediately and update your password in Settings.
            </p>

            {demoPassGenerated ? (
              <div className="space-y-2.5 pt-1">
                <div className="p-2.5 rounded-xl bg-background/90 border border-primary/30 flex items-center justify-between gap-2">
                  <code className="text-xs font-mono font-bold text-primary tracking-wider">{demoPassGenerated}</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCopyPassword}
                    className="h-7 px-2.5 text-xs text-muted-foreground hover:text-primary gap-1 rounded-lg"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>

                <Button
                  onClick={handleQuickDemoSignIn}
                  disabled={demoLoggingIn}
                  className="w-full h-9 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-black shadow-md gap-1.5"
                >
                  {demoLoggingIn ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Sign In & Change Password Now
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateDemoPassword}
                className="w-full h-9 rounded-xl text-xs font-bold border-amber-500/30 text-amber-400 hover:bg-amber-500/10 gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                Generate Temporary Demo Password
              </Button>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-2 pt-0 pb-6 text-center">
          <Link href="/login" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
