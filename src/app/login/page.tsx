'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Leaf, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';

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

      // 2. Perform Supabase Sign Up (without OTP verification step)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name || 'User',
            age: (age && !isNaN(parseInt(age))) ? parseInt(age) : null,
            occupation: occupation || null,
            org_id: targetOrgId,
          }
        }
      });

      if (error) {
        console.error('Signup error:', error);
        toast.error(error.message);
        setLoading(false);
        return;
      }

      if (!data.session) {
        toast.success('Account created! Please check your email for a confirmation link.');
        setActiveTab('login');
        return;
      }

      toast.success('Logged in successfully!');
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      console.error('Unexpected error:', err);
      toast.error(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 -right-4 w-72 h-72 bg-accent/10 rounded-full blur-3xl" />

      <div className="w-full max-w-5xl grid gap-6 lg:grid-cols-2 relative z-10">
        <Card className="hidden lg:flex flex-col justify-between border-border/70 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-8">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Leaf className="h-4 w-4" />
              EcoTrack
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-semibold tracking-tight">
                Build greener habits with one daily check-in.
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Join your campus or workplace community, track your impact, and improve your score week over week.
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
            Ranked by <span className="font-medium text-foreground">Most Improved</span>, not just highest score.
          </div>
        </Card>

        <Card className="w-full border-border bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Leaf className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight">Welcome to EcoTrack</CardTitle>
            <CardDescription>Sign in or create your account in under a minute.</CardDescription>
          </CardHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

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
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Continue'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-sm text-muted-foreground"
                onClick={() => {
                  setActiveTab('signup');
                  setStep(1);
                }}
              >
                New to EcoTrack? Create an account
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
                    <Select value={occupation} onValueChange={(value) => setOccupation(value)}>
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
                <Button className="w-full h-11" onClick={() => setStep(2)}>
                  Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Organization Slug</label>
                  <Input placeholder="e.g. your-college-slug" value={orgSlug} onChange={(e) => setOrgSlug(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Preferred but optional: add your college or company to join its leaderboard (example: ait-pune).</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 h-11" onClick={() => setStep(1)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button className="flex-[2] h-11" onClick={() => setStep(3)}>
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
                  <Input type="password" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 h-11" onClick={() => setStep(2)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button className="flex-[2] h-11" onClick={handleSignUpInit} disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Create Account'}
                  </Button>
                </div>
              </div>
            )}

            <Button
              type="button"
              variant="ghost"
              className="w-full text-sm text-muted-foreground"
              onClick={() => {
                setActiveTab('login');
                setStep(1);
              }}
            >
              Already have an account? Log in
            </Button>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
    </div>
  );
}
