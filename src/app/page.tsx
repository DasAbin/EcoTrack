import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Leaf, Globe, Zap, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let profile = null;
  if (user) {
    const { data } = await supabase.from('profiles').select('name').eq('id', user.id).single();
    profile = data;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-16 flex items-center bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <Link className="flex items-center justify-center font-bold text-xl text-white" href="/">
          <Leaf className="h-6 w-6 mr-2 text-primary" />
          EcoTrack
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
          {user ? (
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="border-primary bg-primary/20 text-white hover:bg-primary hover:text-white rounded-full font-medium shadow-md shadow-primary/20">
                Hi, {profile?.name?.split(' ')[0] || 'Explorer'}
              </Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button variant="outline" size="sm" className="border-white/20 text-white bg-white/10 hover:bg-white hover:text-black rounded-full font-medium">
                Login
              </Button>
            </Link>
          )}
        </nav>
      </header>
      <main className="flex-1 bg-background">
        <section className="relative w-full h-[80vh] min-h-[600px] flex items-center justify-center overflow-hidden">
          {/* Background Image and Overlay */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/hero-bg.png')" }}
          />
          <div className="absolute inset-0 bg-black/50" /> {/* Dark overlay for text readability */}
          
          <div className="container relative px-4 md:px-6 mx-auto z-10">
            <div className="flex flex-col items-center space-y-8 text-center max-w-4xl mx-auto">
              {/* Optional sub-pill matching the leaf vibe */}
              <div className="inline-flex items-center rounded-full border border-white/30 bg-black/20 px-4 py-1.5 text-sm text-white font-medium backdrop-blur-sm">
                <Leaf className="mr-2 h-4 w-4" /> EcoTrack 2026
              </div>
              
              {/* Massive White Uppercase Header to match reference */}
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-[5.5rem] leading-none text-white drop-shadow-lg uppercase">
                WE TRACK OUR <br /> ENVIRONMENT
              </h1>
              
              <p className="mx-auto max-w-[700px] text-white/90 md:text-xl font-medium tracking-wide drop-shadow-md">
                Personal & community eco-impact analyzer natively built for the Indian context. 
                Reduce, Reuse, Recycle.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mt-6 px-4">
                <Link href="/login" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto h-14 px-10 text-base rounded-full border-2 border-white bg-transparent text-white hover:bg-white hover:text-black transition-all duration-300 uppercase tracking-widest backdrop-blur-sm">
                    Get Started
                  </Button>
                </Link>
                <Link href="/org/mit-pune" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto h-14 px-10 text-base rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 uppercase tracking-widest border-2 border-primary shadow-lg border-transparent">
                    View Demo
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-16 md:py-24 bg-primary/5 rounded-t-[3rem] mt-10 shadow-sm border-t border-primary/10">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
              <div className="group flex flex-col space-y-4 border border-border/50 p-8 rounded-[2rem] bg-card hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold tracking-tight">AI Analysis</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Simply describe your day and our AI invisibly extracts your activities to calculate a highly precise CO₂ footprint.
                </p>
              </div>
              <div className="group flex flex-col space-y-4 border border-border/50 p-8 rounded-[2rem] bg-card hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold tracking-tight">Community</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Join your college or corporate leaderboard anonymously. See who's making the biggest impact this week.
                </p>
              </div>
              <div className="group flex flex-col space-y-4 border border-border/50 p-8 rounded-[2rem] bg-card hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
                <div className="h-14 w-14 rounded-full bg-accent/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Globe className="h-6 w-6 text-accent-foreground" />
                </div>
                <h3 className="text-2xl font-bold tracking-tight">Indian Context</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Our models natively understand Auto-Rickshaws, Local Trains, and Indian emission factors out of the box.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">© 2026 EcoTrack Inc. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="#">Terms of Service</Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">Privacy</Link>
        </nav>
      </footer>
    </div>
  );
}
