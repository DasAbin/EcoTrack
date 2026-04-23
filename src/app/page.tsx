import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Leaf, Globe, Zap, Users } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-14 flex items-center">
        <Link className="flex items-center justify-center" href="/">
          <Leaf className="h-6 w-6 text-primary" />
          <span className="ml-2 font-bold text-xl">EcoTrack</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="/login">
            Login
          </Link>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-primary/5">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  Analyze Your Eco-Impact in Seconds
                </h1>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                  Personal + community eco-impact analyzer for the Indian context. 
                  Use AI to track your footprint and compete with your organization.
                </p>
              </div>
              <div className="space-x-4">
                <Link href="/login">
                  <Button size="lg" className="bg-primary hover:bg-primary/90">Get Started</Button>
                </Link>
                <Link href="/org/mit-pune">
                  <Button size="lg" variant="outline">View Demo Org</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col items-center space-y-2 border p-6 rounded-xl bg-card">
                <Zap className="h-10 w-10 text-primary mb-2" />
                <h3 className="text-xl font-bold">AI Analysis</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Simply describe your day and our AI extracts activities and calculates your CO2 footprint.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 border p-6 rounded-xl bg-card">
                <Users className="h-10 w-10 text-primary mb-2" />
                <h3 className="text-xl font-bold">Community</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Join your organization's leaderboard and see who's making the most impact.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-2 border p-6 rounded-xl bg-card">
                <Globe className="h-10 w-10 text-primary mb-2" />
                <h3 className="text-xl font-bold">Indian Context</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Emission factors and suggestions tailored specifically for life in India.
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
