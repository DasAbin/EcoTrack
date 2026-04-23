'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, ArrowDown, User, School } from 'lucide-react';

export default function LeaderboardPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>('');
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUser(user.id);

      // Get user's org
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id, orgs(name)')
        .eq('id', user.id)
        .single();

      if (profile?.org_id) {
        setOrgName((profile.orgs as any).name);
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

  const mostImproved = [...data].sort((a, b) => (a.improvement_delta || 0) - (b.improvement_delta || 0));
  const lowestTotal = [...data].sort((a, b) => a.total_score - b.total_score);

  return (
    <div className="flex-1 space-y-8 p-8 pt-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight flex items-center">
          <Trophy className="mr-3 h-8 w-8 text-amber-500" />
          Leaderboard
        </h2>
        <div className="flex items-center text-muted-foreground">
          <School className="mr-2 h-4 w-4" />
          <span>{orgName || 'Loading organization...'}</span>
        </div>
      </div>

      <Tabs defaultValue="improved" className="space-y-4">
        <TabsList>
          <TabsTrigger value="improved">Most Improved</TabsTrigger>
          <TabsTrigger value="lowest">Lowest Total Score</TabsTrigger>
        </TabsList>
        <TabsContent value="improved" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Reducers</CardTitle>
              <CardDescription>Members who reduced their footprint the most in the last 7 days.</CardDescription>
            </CardHeader>
            <CardContent>
              <LeaderboardTable data={mostImproved} currentUserId={currentUser} isDelta />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="lowest" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Eco Champions</CardTitle>
              <CardDescription>Members with the lowest total CO2e emission this week.</CardDescription>
            </CardHeader>
            <CardContent>
              <LeaderboardTable data={lowestTotal} currentUserId={currentUser} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LeaderboardTable({ data, currentUserId, isDelta = false }: { data: any[], currentUserId: string | null, isDelta?: boolean }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[80px]">Rank</TableHead>
          <TableHead>Member</TableHead>
          <TableHead className="text-right">{isDelta ? 'Improvement' : 'Total Score'}</TableHead>
          <TableHead className="text-right">Total Score</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row, i) => (
          <TableRow key={row.user_id} className={row.user_id === currentUserId ? 'bg-primary/10' : ''}>
            <TableCell className="font-bold">
              {i + 1 === 1 ? '🥇' : i + 1 === 2 ? '🥈' : i + 1 === 3 ? '🥉' : i + 1}
            </TableCell>
            <TableCell className="font-medium flex items-center">
              <User className="mr-2 h-4 w-4 text-muted-foreground" />
              {row.name} {row.user_id === currentUserId && '(You)'}
            </TableCell>
            <TableCell className="text-right">
              {isDelta ? (
                <span className={`flex items-center justify-end ${row.improvement_delta <= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {row.improvement_delta <= 0 ? <ArrowDown className="mr-1 h-4 w-4" /> : '+'}
                  {Math.abs(row.improvement_delta || 0).toFixed(2)} kg
                </span>
              ) : (
                <span className="font-bold text-primary">{row.total_score.toFixed(2)} kg</span>
              )}
            </TableCell>
            <TableCell className="text-right text-muted-foreground">
              {row.total_score.toFixed(2)} kg CO₂e
            </TableCell>
          </TableRow>
        ))}
        {data.length === 0 && (
          <TableRow>
            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
              No data available yet for this week.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
