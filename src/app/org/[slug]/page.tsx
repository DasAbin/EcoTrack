import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Trophy, Leaf } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

type LeaderboardRow = {
  user_id: string;
  name: string | null;
  total_score: number;
};

const DEMO_LEADERBOARD: LeaderboardRow[] = [
  { user_id: 'demo-1', name: 'Priya Sharma', total_score: 8.42 },
  { user_id: 'demo-2', name: 'Arjun Mehta', total_score: 11.05 },
  { user_id: 'demo-3', name: 'Ananya Iyer', total_score: 14.28 },
  { user_id: 'demo-4', name: 'Rohan Patil', total_score: 16.91 },
  { user_id: 'demo-5', name: 'Kavya Nair', total_score: 19.33 },
];

export default async function OrgLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  // Fetch org details
  const { data: org } = await supabase
    .from('orgs')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!org) {
    notFound();
  }

  // Fetch member count
  const { count: memberCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', org.id);

  // Fetch leaderboard preview
  const { data: leaderboard } = await supabase
    .from('leaderboard_view')
    .select('*')
    .eq('org_id', org.id)
    .order('total_score', { ascending: true })
    .limit(5);

  const leaderboardRows: LeaderboardRow[] =
    leaderboard && leaderboard.length > 0
      ? (leaderboard as LeaderboardRow[])
      : DEMO_LEADERBOARD;
  const isDemoLeaderboard = !leaderboard || leaderboard.length === 0;
  const displayMemberCount =
    (memberCount ?? 0) > 0 ? memberCount : 42;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex-1 flex flex-col">
        <section className="w-full py-12 md:py-24 lg:py-32 bg-primary/5">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  {org.name} Eco Community
                </h1>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                  Join {displayMemberCount} members in tracking and reducing your environmental impact.
                  {isDemoLeaderboard && (
                    <span className="block text-sm mt-2 text-muted-foreground/80">
                      Member count is illustrative until your org has active accounts.
                    </span>
                  )}
                </p>
              </div>
              <div className="space-x-4">
                <Link href="/login">
                  <Button size="lg" className="bg-primary hover:bg-primary/90">
                    Join this Community
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-10 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary flex items-center w-fit">
                  <Users className="mr-2 h-4 w-4" /> Community Insights
                </div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">Impact Leaderboard</h2>
                <p className="text-muted-foreground md:text-lg">
                  See who is leading the way in sustainability at {org.name}.
                </p>
                <Card className="mt-4">
                  <CardContent className="p-0">
                    {isDemoLeaderboard && (
                      <p className="px-4 pt-4 pb-2 text-xs text-muted-foreground border-b border-border/60">
                        Sample leaderboard for this demo — log activities after joining to see live ranks.
                      </p>
                    )}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">Rank</TableHead>
                          <TableHead>Member</TableHead>
                          <TableHead className="text-right">Score</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leaderboardRows.map((row, i) => (
                          <TableRow key={row.user_id}>
                            <TableCell className="font-bold">{i + 1}</TableCell>
                            <TableCell>{row.name}</TableCell>
                            <TableCell className="text-right font-medium">{row.total_score.toFixed(2)} kg</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
              <div className="flex flex-col justify-center space-y-4">
                <div className="grid gap-6 sm:grid-cols-2">
                  <Card className="border-primary/20">
                    <CardHeader className="pb-2">
                      <Trophy className="h-8 w-8 text-amber-500 mb-2" />
                      <CardTitle className="text-xl">Recognition</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Get recognized as an Eco Champion within your organization.
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-primary/20">
                    <CardHeader className="pb-2">
                      <Leaf className="h-8 w-8 text-primary mb-2" />
                      <CardTitle className="text-xl">Actionable Tips</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Receive AI-powered tips tailored to the Indian context.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
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
