'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Leaf, Send, History, TrendingUp, BarChart3, Loader2, CheckCircle2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

interface Activity {
  type: string;
  quantity: number;
  unit: string;
  label: string;
  score: number;
}

interface AnalysisResult {
  activities: Activity[];
  breakdown: Record<string, number>;
  total_score: number;
}

export default function DashboardPage() {
  const [input, setInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [scores, setScores] = useState<any[]>([]);
  const [todayScore, setTodayScore] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const supabase = createClient();

  const fetchScores = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('scores')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);

    if (data) {
      setScores(data);
      const today = new Date().toISOString().split('T')[0];
      const todayEntry = data.find(s => s.created_at.startsWith(today));
      if (todayEntry) {
        setTodayScore(todayEntry.total_score);
        setSuggestions(todayEntry.suggestions);
      }
    }
  }, [supabase]);

  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  const handleAnalyze = async () => {
    if (!input.trim()) return;
    setAnalyzing(true);
    setAnalysis(null);
    setSuggestions([]);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAnalysis(data);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!analysis) return;
    setSaving(true);

    try {
      const res = await fetch('/api/save-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_input: input,
          parsed_activities: analysis.activities,
          total_score: analysis.total_score,
          breakdown: analysis.breakdown,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      toast.success('Score saved successfully!');
      setTodayScore(analysis.total_score);
      setSuggestions(data.suggestions);
      setAnalysis(null);
      setInput('');
      fetchScores();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  // Chart Data Preparation
  const weeklyData = scores.slice(0, 7).reverse().map(s => ({
    date: format(new Date(s.created_at), 'MMM dd'),
    score: s.total_score,
  }));

  const monthlyData = scores.reduce((acc: any[], s) => {
    const weekStart = format(startOfWeek(new Date(s.created_at)), 'MMM dd');
    const existing = acc.find(a => a.week === weekStart);
    if (existing) {
      existing.score += s.total_score;
    } else {
      acc.push({ week: weekStart, score: s.total_score });
    }
    return acc;
  }, []).reverse();

  return (
    <div className="flex-1 space-y-8 p-8 pt-6 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Eco Dashboard</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="col-span-1 border-primary/20 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Eco Score</CardTitle>
            <Leaf className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary">
              {todayScore !== null ? todayScore.toFixed(2) : '--'}
              <span className="text-sm font-normal text-muted-foreground ml-2">kg CO₂e</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {todayScore !== null ? 'Great job logging today!' : 'Log your activities to see your score'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-full lg:col-span-4">
          <CardHeader>
            <CardTitle>Daily Log</CardTitle>
            <CardDescription>
              Describe your day's activities (e.g., "I drove 20km in a car, used 5 units of electricity, and bought 2 plastic bottles").
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="What did you do today?"
              className="min-h-[120px] resize-none"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={analyzing || saving}
            />
            <div className="flex justify-end">
              <Button onClick={handleAnalyze} disabled={analyzing || saving || !input.trim()}>
                {analyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Analyze Impact
              </Button>
            </div>

            {analysis && (
              <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center">
                    <CheckCircle2 className="mr-2 h-5 w-5 text-primary" />
                    Detected Impact
                  </h3>
                  <div className="text-2xl font-bold text-primary">{analysis.total_score.toFixed(2)} kg CO₂e</div>
                </div>
                <Table className="border rounded-md">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Activity</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">CO₂e</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysis.activities.map((act, i) => (
                      <TableRow key={i}>
                        <TableCell className="capitalize">{act.label || act.type.replace('_', ' ')}</TableCell>
                        <TableCell className="text-right">{act.quantity} {act.unit}</TableCell>
                        <TableCell className="text-right font-medium">{act.score.toFixed(2)} kg</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setAnalysis(null)}>Cancel</Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Confirm & Save'}
                  </Button>
                </div>
              </div>
            )}

            {suggestions.length > 0 && !analysis && (
              <div className="mt-6 p-4 rounded-lg bg-accent/10 border border-accent/20">
                <h3 className="text-sm font-semibold text-accent mb-2 flex items-center">
                  💡 Tips for You
                </h3>
                <ul className="space-y-2">
                  {suggestions.map((tip, i) => (
                    <li key={i} className="text-sm text-foreground/80 flex items-start">
                      <span className="mr-2 mt-1 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-full lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-4 w-4" />
              Weekly Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="date" stroke="#888" fontSize={12} />
                  <YAxis stroke="#888" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
                    itemStyle={{ color: '#15803d' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#15803d" 
                    strokeWidth={2} 
                    dot={{ fill: '#15803d' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-full">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="mr-2 h-4 w-4" />
              Monthly Progress (Weekly Totals)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="week" stroke="#888" fontSize={12} />
                  <YAxis stroke="#888" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
                    itemStyle={{ color: '#15803d' }}
                  />
                  <Bar dataKey="score" fill="#15803d" radius={[4, 4, 0, 0]}>
                    {monthlyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.score > 50 ? '#f59e0b' : '#15803d'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
