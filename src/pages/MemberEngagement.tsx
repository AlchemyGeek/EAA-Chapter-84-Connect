import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { Activity, Users, TrendingUp, Star, Moon, MousePointerClick, Info, ArrowUpDown, Download } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Link } from "react-router-dom";

const trendChartConfig = {
  active_members: {
    label: "Active Members",
    color: "hsl(var(--primary))",
  },
};

type MemberRow = {
  key_id: number;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  email: string | null;
  total_events: number;
  events_30d: number;
  events_7d: number;
  last_seen: string | null;
};

type SortKey = "name" | "total_events" | "events_30d" | "events_7d" | "last_seen";

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function displayName(m: MemberRow): string {
  const first = m.nickname?.trim() || m.first_name?.trim() || "";
  return `${first} ${m.last_name ?? ""}`.trim() || "Unknown";
}

export default function MemberEngagement() {
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ["engagement-kpis"],
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("engagement_kpis");
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  const { data: trend = [], isLoading: trendLoading } = useQuery({
    queryKey: ["engagement-trend"],
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("engagement_trend");
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        week: new Date(row.week_start).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        active_members: Number(row.active_members),
      }));
    },
  });

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ["engagement-by-member"],
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("engagement_by_member");
      if (error) throw error;
      return (data ?? []) as MemberRow[];
    },
  });

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("last_seen");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? members.filter((m) => displayName(m).toLowerCase().includes(q) || (m.email ?? "").toLowerCase().includes(q))
      : members;
    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = displayName(a).localeCompare(displayName(b));
          break;
        case "total_events":
          cmp = Number(a.total_events) - Number(b.total_events);
          break;
        case "events_30d":
          cmp = Number(a.events_30d) - Number(b.events_30d);
          break;
        case "events_7d":
          cmp = Number(a.events_7d) - Number(b.events_7d);
          break;
        case "last_seen": {
          const at = a.last_seen ? new Date(a.last_seen).getTime() : 0;
          const bt = b.last_seen ? new Date(b.last_seen).getTime() : 0;
          cmp = at - bt;
          break;
        }
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [members, search, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  const exportCsv = () => {
    const header = ["Name", "Email", "Total", "Last 30d", "Last 7d", "Last seen"];
    const rows = filteredSorted.map((m) => [
      displayName(m),
      m.email ?? "",
      m.total_events,
      m.events_30d,
      m.events_7d,
      m.last_seen ?? "",
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `member-activity-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const engagementRate =
    kpis && kpis.total_active_members > 0
      ? Math.round((Number(kpis.active_30d) / Number(kpis.total_active_members)) * 100)
      : 0;

  const kpiCards = [
    { label: "Active (30d)", value: kpis?.active_30d ?? "—", icon: Users, color: "text-primary", description: "Members who logged in or used the app at least once in the last 30 days." },
    { label: "Weekly Active", value: kpis?.active_7d ?? "—", icon: TrendingUp, color: "text-chart-2", description: "Members who logged in or used the app at least once in the last 7 days." },
    { label: "Engagement Rate", value: kpis ? `${engagementRate}%` : "—", icon: Activity, color: "text-chart-3", description: "Percentage of active roster members who used the app in the last 30 days." },
    { label: "Highly Engaged", value: kpis?.highly_engaged_30d ?? "—", icon: Star, color: "text-chart-4", description: "Members with 5 or more interactions in the last 30 days." },
    { label: "Dormant (60d)", value: kpis?.dormant_60d ?? "—", icon: Moon, color: "text-muted-foreground", description: "Active roster members with no app activity in the last 60 days." },
    { label: "Service Views (30d)", value: kpis?.service_page_views_30d ?? "—", icon: MousePointerClick, color: "text-chart-5", description: "Total visits to service pages (dues, volunteering, etc.) in the last 30 days." },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-xl md:text-2xl font-bold">Member Engagement</h1>

      {kpisLoading ? (
        <p className="text-muted-foreground">Loading KPIs...</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpiCards.map((kpi) => (
            <Card key={kpi.label}>
              <CardContent className="p-4 flex flex-col items-center text-center gap-1 relative">
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="absolute top-2 right-2 p-2 -m-1 rounded-full hover:bg-muted"
                      aria-label={`Info about ${kpi.label}`}
                    >
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="top" className="max-w-[260px] w-auto p-3 text-xs">
                    {kpi.description}
                  </PopoverContent>
                </Popover>
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                <p className="text-2xl font-bold">{String(kpi.value)}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weekly Active Members (12 Weeks)</CardTitle>
        </CardHeader>
        <CardContent>
          {trendLoading ? (
            <p className="text-muted-foreground">Loading trend...</p>
          ) : trend.length === 0 ? (
            <p className="text-muted-foreground text-sm">No engagement data yet. Data will appear as members use the app.</p>
          ) : (
            <ChartContainer config={trendChartConfig} className="h-[300px] w-full">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="active_members"
                  stroke="var(--color-active_members)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Member Activity</CardTitle>
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full sm:w-64"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={exportCsv}
              disabled={filteredSorted.length === 0}
              className="gap-1.5"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {membersLoading ? (
            <p className="text-muted-foreground text-sm">Loading members…</p>
          ) : filteredSorted.length === 0 ? (
            <p className="text-muted-foreground text-sm">No matching members.</p>
          ) : (
            <>
              {/* Mobile: stacked cards + sort control */}
              <div className="sm:hidden space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground shrink-0">Sort by</span>
                  <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                    <SelectTrigger className="h-9 flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="last_seen">Last seen</SelectItem>
                      <SelectItem value="total_events">Total events</SelectItem>
                      <SelectItem value="events_30d">Last 30 days</SelectItem>
                      <SelectItem value="events_7d">Last 7 days</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
                    aria-label={`Sort ${sortDir === "asc" ? "ascending" : "descending"}`}
                  >
                    {sortDir === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                  </Button>
                </div>

                <ul className="divide-y border-t border-b">
                  {filteredSorted.map((m) => (
                    <li key={m.key_id} className="py-3 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/directory/${m.key_id}`}
                            className="text-primary hover:underline font-medium block truncate"
                          >
                            {displayName(m)}
                          </Link>
                          {m.email && (
                            <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0 pt-0.5">
                          {formatRelative(m.last_seen)}
                        </span>
                      </div>
                      <div className="flex gap-2 text-xs">
                        <span className="px-2 py-1 rounded border tabular-nums">
                          <span className="text-muted-foreground">Total</span> <span className="font-medium">{m.total_events}</span>
                        </span>
                        <span className="px-2 py-1 rounded border tabular-nums">
                          <span className="text-muted-foreground">30d</span> <span className="font-medium">{m.events_30d}</span>
                        </span>
                        <span className="px-2 py-1 rounded border tabular-nums">
                          <span className="text-muted-foreground">7d</span> <span className="font-medium">{m.events_7d}</span>
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Desktop: table */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <button onClick={() => toggleSort("name")} className="inline-flex items-center gap-1 hover:text-foreground">
                          Member <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </TableHead>
                      <TableHead className="text-right">
                        <button onClick={() => toggleSort("total_events")} className="inline-flex items-center gap-1 hover:text-foreground">
                          Total <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </TableHead>
                      <TableHead className="text-right">
                        <button onClick={() => toggleSort("events_30d")} className="inline-flex items-center gap-1 hover:text-foreground">
                          30d <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </TableHead>
                      <TableHead className="text-right">
                        <button onClick={() => toggleSort("events_7d")} className="inline-flex items-center gap-1 hover:text-foreground">
                          7d <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </TableHead>
                      <TableHead className="text-right">
                        <button onClick={() => toggleSort("last_seen")} className="inline-flex items-center gap-1 hover:text-foreground">
                          Last seen <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSorted.map((m) => (
                      <TableRow key={m.key_id}>
                        <TableCell>
                          <Link
                            to={`/directory/${m.key_id}`}
                            className="text-primary hover:underline"
                          >
                            {displayName(m)}
                          </Link>
                          {m.email && (
                            <div className="text-xs text-muted-foreground">{m.email}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{m.total_events}</TableCell>
                        <TableCell className="text-right tabular-nums">{m.events_30d}</TableCell>
                        <TableCell className="text-right tabular-nums">{m.events_7d}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatRelative(m.last_seen)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <p className="mt-2 text-xs text-muted-foreground">
                {filteredSorted.length} member{filteredSorted.length === 1 ? "" : "s"} with activity
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
