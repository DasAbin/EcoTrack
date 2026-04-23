'use client';

import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Leaf, Send, History, TrendingUp, Grid3x3, Loader2, CheckCircle2, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, startOfWeek, addDays, startOfDay, startOfYear, endOfYear, endOfWeek } from 'date-fns';

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

interface SavedScore {
  id: string;
  created_at: string;
  raw_input: string | null;
  parsed_activities: unknown;
  total_score: number;
  breakdown: Record<string, number> | null;
  suggestions: unknown;
}

function normalizeSavedActivities(raw: unknown): Activity[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object')
    .map((item) => ({
      type: typeof item.type === 'string' ? item.type : 'unknown',
      quantity: typeof item.quantity === 'number' ? item.quantity : Number(item.quantity) || 0,
      unit: typeof item.unit === 'string' ? item.unit : '',
      label: typeof item.label === 'string' ? item.label : '',
      score: typeof item.score === 'number' ? item.score : Number(item.score) || 0,
    }));
}

function normalizeSavedSuggestions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === 'string');
}

export default function DashboardPage() {
  const [input, setInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [scores, setScores] = useState<SavedScore[]>([]);
  const [todayScore, setTodayScore] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const fetchScores = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('scores')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(400);

    if (data) {
      setScores(data as SavedScore[]);
      const today = new Date().toISOString().split('T')[0];
      const todayEntry = data.find((s: SavedScore) => s.created_at.startsWith(today));
      if (todayEntry) {
        setTodayScore(todayEntry.total_score);
        setSuggestions(normalizeSavedSuggestions(todayEntry.suggestions));
      } else {
        setTodayScore(null);
        setSuggestions([]);
      }
    }
  }, [supabase]);

  const handleDeleteLog = async (scoreId: string) => {
    if (!window.confirm('Remove this log? This cannot be undone.')) return;
    setDeletingId(scoreId);
    try {
      const res = await fetch(`/api/scores/${scoreId}`, { method: 'DELETE' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = [body.error, body.hint].filter(Boolean).join(' — ');
        throw new Error(msg || 'Failed to delete log');
      }
      toast.success('Log removed');
      if (expandedHistoryId === scoreId) setExpandedHistoryId(null);
      await fetchScores();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

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
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Analysis failed');
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
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // Chart Data Preparation
  const weeklyData = scores.slice(0, 7).reverse().map(s => ({
    date: format(new Date(s.created_at), 'MMM dd'),
    score: s.total_score,
  }));

  const dailyHeatmap = useMemo(() => {
    const today = startOfDay(new Date());
    const yStart = startOfYear(today);
    const yEnd = endOfYear(today);
    const gridStart = startOfWeek(yStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(yEnd, { weekStartsOn: 1 });

    const byDay = new Map<string, number>();
    for (const s of scores) {
      const key = format(new Date(s.created_at), 'yyyy-MM-dd');
      byDay.set(key, (byDay.get(key) ?? 0) + Number(s.total_score));
    }

    const columns: { key: string; score: number; date: Date; inYear: boolean }[][] = [];
    let monday = gridStart;
    while (monday <= gridEnd) {
      const col: { key: string; score: number; date: Date; inYear: boolean }[] = [];
      for (let dow = 0; dow < 7; dow++) {
        const date = addDays(monday, dow);
        const key = format(date, 'yyyy-MM-dd');
        const inYear = date >= yStart && date <= yEnd;
        col.push({ key, score: byDay.get(key) ?? 0, date, inYear });
      }
      columns.push(col);
      monday = addDays(monday, 7);
    }

    let maxScore = 0;
    for (const col of columns) {
      for (const cell of col) {
        if (cell.inYear && cell.date <= today) maxScore = Math.max(maxScore, cell.score);
      }
    }
    if (maxScore <= 0) maxScore = 1;

    return { columns, today, maxScore, year: today.getFullYear(), yStart, yEnd };
  }, [scores]);

  function heatCellClass(
    score: number,
    maxScore: number,
    date: Date,
    today: Date,
    inYear: boolean
  ): string {
    const base =
      'size-3.5 shrink-0 rounded-sm border border-border/60 transition-all duration-200 ease-out cursor-default hover:z-10 hover:scale-125 hover:shadow-md hover:ring-2 hover:ring-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50';
    if (!inYear) {
      return `${base} border-dashed border-border/40 bg-muted/10 opacity-50 hover:opacity-70 hover:scale-110`;
    }
    if (date > today) {
      if (score > 0) {
        return `${base} bg-primary/15 border-primary/25 hover:bg-primary/25`;
      }
      return `${base} bg-muted/50 dark:bg-muted/40 border-border/80 hover:bg-muted/65 dark:hover:bg-muted/55`;
    }
    if (score <= 0) return `${base} bg-muted/30 hover:bg-muted/45`;
    const t = score / maxScore;
    if (t < 0.2) return `${base} bg-primary/20 hover:bg-primary/30`;
    if (t < 0.45) return `${base} bg-primary/40 hover:bg-primary/55`;
    if (t < 0.7) return `${base} bg-primary/65 hover:bg-primary/80`;
    return `${base} bg-primary hover:bg-primary/90`;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Logged out successfully');
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="flex-1 space-y-8 p-8 pt-6 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Leaf className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Eco Dashboard</h2>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout} className="border-primary/20 hover:bg-primary/10">
          Log Out
        </Button>
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
          <CardContent className="min-h-[300px] min-w-0">
            <div className="h-[250px] w-full min-h-[200px] min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
              <Grid3x3 className="mr-2 h-4 w-4" />
              Daily footprint
            </CardTitle>
            <CardDescription>
              Full calendar year {dailyHeatmap.year}: each square is one day (Mon–Sun). Scroll horizontally to see every month. Darker green is more kg CO₂e logged that day. Upcoming days use a slightly darker neutral tile; hover any square for details.
            </CardDescription>
          </CardHeader>
          <CardContent className="min-w-0 pt-2">
            <div className="flex gap-2 sm:gap-3 min-w-0">
              <div className="flex flex-col gap-1 pt-5 shrink-0 text-[10px] leading-[0.875rem] text-muted-foreground text-right tabular-nums">
                <span className="size-3.5 flex items-center justify-end">M</span>
                <span className="size-3.5 flex items-center justify-end">T</span>
                <span className="size-3.5 flex items-center justify-end">W</span>
                <span className="size-3.5 flex items-center justify-end">T</span>
                <span className="size-3.5 flex items-center justify-end">F</span>
                <span className="size-3.5 flex items-center justify-end">S</span>
                <span className="size-3.5 flex items-center justify-end">S</span>
              </div>
              <div className="flex gap-1 overflow-x-auto overflow-y-visible pb-14 flex-1 min-w-0 [scrollbar-gutter:stable]">
                {dailyHeatmap.columns.map((week, wi) => {
                  const thursday = week[3]?.date ?? week[0].date;
                  const prevThu =
                    wi > 0 ? dailyHeatmap.columns[wi - 1][3]?.date ?? dailyHeatmap.columns[wi - 1][0].date : null;
                  const showMonth =
                    !prevThu || format(thursday, 'yyyy-MM') !== format(prevThu, 'yyyy-MM');
                  return (
                    <div key={week[0].key} className="flex flex-col gap-1 items-center shrink-0">
                      <span className="h-4 text-[10px] text-muted-foreground tabular-nums w-full text-center truncate px-0.5">
                        {showMonth ? format(thursday, 'MMM') : '\u00a0'}
                      </span>
                      <div className="flex flex-col gap-1">
                        {week.map((cell) => {
                          const dateLabel = format(cell.date, 'MMMM d, yyyy');
                          const subLabel =
                            cell.date > dailyHeatmap.today
                              ? 'Upcoming'
                              : cell.score > 0
                                ? `${cell.score.toFixed(2)} kg CO₂e`
                                : 'No log';
                          return (
                            <div
                              key={cell.key}
                              className="group relative flex flex-col items-center"
                            >
                              <div
                                role="img"
                                tabIndex={0}
                                aria-label={`${dateLabel}: ${subLabel}`}
                                title={`${dateLabel} — ${subLabel}`}
                                className={heatCellClass(
                                  cell.score,
                                  dailyHeatmap.maxScore,
                                  cell.date,
                                  dailyHeatmap.today,
                                  cell.inYear
                                )}
                              />
                              <div
                                className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 w-max max-w-[min(14rem,calc(100vw-2rem))] -translate-x-1/2 rounded-md border border-border bg-card px-2.5 py-1.5 text-center opacity-0 shadow-md ring-1 ring-border/60 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                              >
                                <p className="text-[11px] font-semibold leading-tight text-foreground tabular-nums whitespace-nowrap">
                                  {dateLabel}
                                </p>
                                <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{subLabel}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>Less</span>
              <div className="flex gap-1 items-center">
                <span className="size-3.5 rounded-sm border border-border/60 bg-muted/30" />
                <span className="size-3.5 rounded-sm border border-border/60 bg-primary/20" />
                <span className="size-3.5 rounded-sm border border-border/60 bg-primary/40" />
                <span className="size-3.5 rounded-sm border border-border/60 bg-primary/65" />
                <span className="size-3.5 rounded-sm border border-border/60 bg-primary" />
              </div>
              <span>More</span>
              <span className="text-border hidden sm:inline">|</span>
              <span className="flex items-center gap-1.5 hidden sm:flex">
                <span className="size-3.5 rounded-sm border border-border/80 bg-muted/50 dark:bg-muted/40" />
                <span>Upcoming</span>
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Recent History Table */}
        <Card className="col-span-full border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center">
              <History className="mr-2 h-4 w-4 text-primary" />
              Recent Log History
            </CardTitle>
            <CardDescription>
              Expand a row to see the same activity breakdown and tips that were saved with that log.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {scores.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center bg-primary/5 rounded-xl border border-primary/10">
                <History className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm font-medium text-foreground">No logs yet</p>
                <p className="text-xs text-muted-foreground">Submit your first log to see your history here.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-primary/10 overflow-hidden max-h-[min(70vh,720px)] overflow-y-auto">
                <Table className="table-fixed">
                  <colgroup>
                    <col className="w-[120px]" />
                    <col />
                    <col className="w-[108px]" />
                    <col className="w-[88px]" />
                  </colgroup>
                  <TableHeader className="bg-primary/5 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="w-[120px]">Date</TableHead>
                      <TableHead className="min-w-0">Your Entry</TableHead>
                      <TableHead className="text-right w-[108px]">Impact (CO₂e)</TableHead>
                      <TableHead className="w-[88px] p-2 text-center" aria-label="Row actions">
                        {'\u00a0'}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scores.map((scoreEntry) => {
                      const activities = normalizeSavedActivities(scoreEntry.parsed_activities);
                      const tips = normalizeSavedSuggestions(scoreEntry.suggestions);
                      const open = expandedHistoryId === scoreEntry.id;
                      return (
                        <Fragment key={scoreEntry.id}>
                          <TableRow className="hover:bg-primary/5">
                            <TableCell className="font-medium text-xs text-muted-foreground whitespace-nowrap align-top">
                              {format(new Date(scoreEntry.created_at), 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell className="min-w-0 align-top text-sm text-foreground/90 whitespace-normal break-words [overflow-wrap:anywhere] py-3">
                              {scoreEntry.raw_input || 'No text description recorded.'}
                            </TableCell>
                            <TableCell className="text-right font-medium text-primary align-top whitespace-nowrap w-[108px]">
                              {Number(scoreEntry.total_score).toFixed(2)} kg
                            </TableCell>
                            <TableCell className="p-1 align-top">
                              <div className="flex items-center justify-end gap-0.5">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                                  aria-label="Remove this log"
                                  disabled={deletingId !== null}
                                  onClick={() => handleDeleteLog(scoreEntry.id)}
                                >
                                  {deletingId === scoreEntry.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0"
                                  aria-expanded={open}
                                  aria-label={open ? 'Hide impact details' : 'Show impact details'}
                                  disabled={deletingId !== null}
                                  onClick={() =>
                                    setExpandedHistoryId(open ? null : scoreEntry.id)
                                  }
                                >
                                  {open ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          {open && (
                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                              <TableCell colSpan={4} className="p-4 border-t border-primary/10">
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                                      <CheckCircle2 className="h-4 w-4 text-primary" />
                                      Detected impact (saved)
                                    </h4>
                                    {activities.length === 0 ? (
                                      <p className="text-xs text-muted-foreground">
                                        No activity rows were stored for this entry.
                                      </p>
                                    ) : (
                                      <Table className="border rounded-md text-sm">
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Activity</TableHead>
                                            <TableHead className="text-right">Quantity</TableHead>
                                            <TableHead className="text-right">CO₂e</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {activities.map((act, i) => (
                                            <TableRow key={i}>
                                              <TableCell className="capitalize">
                                                {act.label || act.type.replace(/_/g, ' ')}
                                              </TableCell>
                                              <TableCell className="text-right">
                                                {act.quantity} {act.unit}
                                              </TableCell>
                                              <TableCell className="text-right font-medium">
                                                {act.score.toFixed(2)} kg
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-2">
                                      Total:{' '}
                                      <span className="font-semibold text-primary">
                                        {Number(scoreEntry.total_score).toFixed(2)} kg CO₂e
                                      </span>
                                    </p>
                                  </div>
                                  {tips.length > 0 && (
                                    <div className="rounded-lg bg-accent/10 border border-accent/20 p-3">
                                      <h4 className="text-xs font-semibold text-accent mb-2">Tips from that day</h4>
                                      <ul className="space-y-1.5">
                                        {tips.map((tip, i) => (
                                          <li key={i} className="text-xs text-foreground/80 flex items-start gap-2">
                                            <span className="mt-1 h-1 w-1 rounded-full bg-accent shrink-0" />
                                            {tip}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
