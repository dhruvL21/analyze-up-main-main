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
import { resetPassword } from '@/firebase/auth/auth-service';
import { useAuth } from '@/firebase';
import { Loader2, Mail, CheckCircle2, ArrowLeft } from 'lucide-react';
import { AnalyzeUpIcon } from '@/components/analyze-up-icon';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

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
            Enter your registered email address to receive secure password recovery instructions.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
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
        </CardContent>

        <CardFooter className="flex flex-col gap-2 pt-2 pb-6 text-center">
          <Link href="/login" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
