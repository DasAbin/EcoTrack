'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Leaf, ArrowRight, ArrowLeft, CheckCircle2, Loader2, Mail } from 'lucide-react';

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState('login');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [occupation, setOccupation] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [otp, setOtp] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Logged in successfully!');
      router.push('/dashboard');
      router.refresh();
    }
    setLoading(false);
  };

  const handleSignUpInit = async () => {
    setLoading(true);
    try {
      let targetOrgId = null;
      if (orgSlug) {
        // 1. Verify org exists
        const { data: org, error: orgError } = await supabase
          .from('orgs')
          .select('id')
          .eq('slug', orgSlug)
          .single();

        if (orgError || !org) {
          toast.error('Organization not found. Please check the slug or leave it empty.');
          setLoading(false);
          return;
        }
        
        targetOrgId = org.id;
      }

      // 2. Perform Supabase Sign Up
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            age: parseInt(age),
            occupation,
            org_id: targetOrgId,
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        // Move to OTP step
        setStep(4);
        toast.success('Check your email for the verification code!');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'signup',
      });

      if (error) throw error;

      toast.success('Email verified! Finalizing profile...');
      
      // The profile should be created by a DB trigger on auth.users insert 
      // or we can do it manually here if we don't have a trigger.
      // Since we don't have a trigger yet, let's do it manually.
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        let targetOrgId = null;
        if (orgSlug) {
          const { data: org } = await supabase.from('orgs').select('id').eq('slug', orgSlug).single();
          targetOrgId = org?.id;
        }

        await supabase.from('profiles').insert({
          id: user.id,
          email: user.email,
          name,
          age: parseInt(age),
          occupation,
          org_id: targetOrgId,
        });
      }

      router.push('/dashboard');
      router.refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 -right-4 w-72 h-72 bg-accent/10 rounded-full blur-3xl" />

      <Card className="w-full max-w-md border-border bg-card/50 backdrop-blur-sm relative z-10">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Leaf className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">EcoTrack</CardTitle>
          <CardDescription>Sustainable living, simplified.</CardDescription>
        </CardHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-6">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="login" className="px-6 pb-6 space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Sign In'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="px-6 pb-6 space-y-4">
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <Input placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Age</label>
                    <Input type="number" placeholder="25" value={age} onChange={(e) => setAge(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Role</label>
                    <Select value={occupation} onValueChange={setOccupation}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="job">Working Professional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button className="w-full" onClick={() => setStep(2)}>
                  Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Organization Slug</label>
                  <Input placeholder="e.g. ait-pune" value={orgSlug} onChange={(e) => setOrgSlug(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Optional: Connect with your college or workplace.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button className="flex-[2]" onClick={() => setStep(3)}>
                    Next <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Address</label>
                  <Input type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Create Password</label>
                  <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button className="flex-[2]" onClick={handleSignUpInit} disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Create Account'}
                  </Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex flex-col items-center text-center space-y-2 py-4">
                  <div className="p-3 bg-primary/10 rounded-full mb-2">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">Verify your email</h3>
                  <p className="text-sm text-muted-foreground">We've sent a 6-digit code to {email}</p>
                </div>
                <div className="space-y-2">
                  <Input 
                    placeholder="123456" 
                    className="text-center text-2xl tracking-[1em] font-bold" 
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                </div>
                <Button className="w-full" onClick={handleVerifyOtp} disabled={loading || otp.length < 6}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Verify & Continue'}
                </Button>
                <Button variant="ghost" className="w-full text-xs" onClick={() => setStep(3)}>
                  Change email address
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
