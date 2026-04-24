'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, ArrowDown, User, School, Leaf, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LeaderboardPage() {
  const [data, setData] = useState<any[]>([]);
  const [globalData, setGlobalData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>('');
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUser(user.id);

      // Get user's org info
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id, orgs(name)')
        .eq('id', user.id)
        .single();

      // Fetch Global Leaderboard (Always)
      const { data: global } = await supabase
        .from('leaderboard_view')
        .select('*')
        .order('total_score', { ascending: true })
        .limit(20);
      
      if (global) setGlobalData(global);

      // Fetch Org Leaderboard (If joined)
      if (profile?.org_id) {
        const orgsRel = profile.orgs as { name: string } | { name: string }[] | null | undefined;
        const orgLabel = Array.isArray(orgsRel) ? orgsRel[0]?.name : orgsRel?.name;
        setOrgName(orgLabel || '');
        const { data: leaderboard } = await supabase
          .from('leaderboard_view')
          .select('*')
          .eq('org_id', profile.org_id);
        
        if (leaderboard) {
          setData(leaderboard);
        }
      }
      setLoading(false);
    }
    fetchData();
  }, [supabase]);

  const mostImproved = [...(orgName ? data : globalData)].sort((a, b) => (a.improvement_delta || 0) - (b.improvement_delta || 0));
  const lowestTotal = [...(orgName ? data : globalData)].sort((a, b) => a.total_score - b.total_score);

  return (
    <div className="flex-1 space-y-8 p-8 pt-6 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
      <div className="space-y-2 border-b border-border/50 pb-6">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Trophy className="h-9 w-9 text-amber-500 drop-shadow-sm" />
          Impact Leaderboard
        </h2>
        <div className="flex items-center gap-2 text-muted-foreground bg-primary/5 px-3 py-1 rounded-full w-fit border border-primary/10">
          <School className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{orgName || 'Global Community'}</span>
        </div>
      </div>

      <Tabs defaultValue="improved" className="space-y-6">
        <div className="flex justify-start">
          <TabsList className="bg-muted/50 p-1 rounded-full h-12 mb-4">
            <TabsTrigger value="improved" className="rounded-full px-6 text-sm font-medium h-9">Most Improved</TabsTrigger>
            <TabsTrigger value="lowest" className="rounded-full px-6 text-sm font-medium h-9">Top Eco-Performers</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="improved" className="space-y-4">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
            <CardHeader className="bg-primary/5 border-b border-border/50">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <CardTitle>Top Reducers</CardTitle>
              </div>
              <CardDescription>Members who reduced their footprint the most this week.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <LeaderboardTable data={mostImproved} currentUserId={currentUser} isDelta />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lowest" className="space-y-4">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
            <CardHeader className="bg-primary/5 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Leaf className="h-5 w-5 text-primary" />
                <CardTitle>Eco Champions</CardTitle>
              </div>
              <CardDescription>Members with the absolute lowest CO2e total this week.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <LeaderboardTable data={lowestTotal} currentUserId={currentUser} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LeaderboardTable({ data, currentUserId, isDelta = false }: { data: any[], currentUserId: string | null, isDelta?: boolean }) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="p-4 bg-muted/20 rounded-full">
           <Trophy className="h-10 w-10 text-muted-foreground/30" />
        </div>
        <div>
          <p className="text-lg font-medium text-foreground">No data for this week</p>
          <p className="text-sm text-muted-foreground">Start logging your activities to see the rankings!</p>
        </div>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader className="bg-muted/30">
        <TableRow>
          <TableHead className="w-[80px] font-bold">Rank</TableHead>
          <TableHead>Member</TableHead>
          <TableHead className="text-right">{isDelta ? 'Net Change' : 'Total Score'}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row, i) => (
          <TableRow key={row.user_id} className={cn("hover:bg-primary/5 transition-colors", row.user_id === currentUserId ? 'bg-primary/10 border-l-4 border-l-primary' : '')}>
            <TableCell className="font-bold py-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted/50">
                {i + 1 === 1 ? '🥇' : i + 1 === 2 ? '🥈' : i + 1 === 3 ? '🥉' : i + 1}
              </div>
            </TableCell>
            <TableCell className="font-medium">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-secondary rounded-md text-secondary-foreground">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    {row.name}
                    {row.user_id === currentUserId && <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full uppercase tracking-tighter">You</span>}
                  </div>
                </div>
              </div>
            </TableCell>
            <TableCell className="text-right py-4">
              {isDelta ? (
                <div className={cn("inline-flex items-center gap-1 font-bold", row.improvement_delta <= 0 ? 'text-green-500' : 'text-amber-600')}>
                  {row.improvement_delta <= 0 ? <ArrowDown className="h-4 w-4" /> : '+'}
                  {Math.abs(row.improvement_delta || 0).toFixed(1)} kg
                </div>
              ) : (
                <div className="font-bold text-foreground">
                  {row.total_score.toFixed(1)} <span className="text-xs font-normal text-muted-foreground font-mono">kg</span>
                </div>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function someUtility() {
  // Logic here if needed
}
