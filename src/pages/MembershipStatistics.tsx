import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from "recharts";
import { Users, UserCheck, UserX, UserPlus, AlertTriangle, ChevronDown } from "lucide-react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseUdf1PaymentDate(udf1: string | null): Date | null {
  if (!udf1) return null;
  const match = udf1.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (!match) return null;
  let [, m, d, y] = match;
  let year = parseInt(y, 10);
  if (year < 100) year += 2000;
  const date = new Date(year, parseInt(m, 10) - 1, parseInt(d, 10));
  return isNaN(date.getTime()) ? null : date;
}

const chartConfig = {
  renewed: {
    label: "Members Renewed",
    color: "hsl(var(--primary))",
  },
};

const standingChartConfig = {
  total: {
    label: "Good Standing",
    color: "hsl(var(--chart-2, 142 71% 45%))",
  },
};

const newMembersChartConfig = {
  newMembers: {
    label: "New Members",
    color: "hsl(var(--chart-3, 221 83% 53%))",
  },
};

const inactiveChartConfig = {
  inactive: {
    label: "Inactive Members",
    color: "hsl(var(--destructive))",
  },
};

export default function MembershipStatistics() {
  const currentYear = new Date().getFullYear();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["membership-stats-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roster_members")
        .select("first_name, last_name, current_standing, expiration_date, date_added, udf1_text");
      if (error) throw error;
      return data;
    },
  });

  const { data: lastImport } = useQuery({
    queryKey: ["membership-stats-last-import"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roster_imports")
        .select("imported_at")
        .order("imported_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: inactiveByImport = [] } = useQuery({
    queryKey: ["membership-stats-inactive-by-import"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("inactive_members_by_import");
      if (error) throw error;
      return data as { imported_at: string; total_members: number; inactive_count: number }[];
    },
  });

  const lastImportMonth = lastImport?.imported_at
    ? new Date(lastImport.imported_at).getMonth()
    : new Date().getMonth();

  // KPIs
  const goodStanding = members.filter((m) => {
    if (m.current_standing !== "Active") return false;
    if (!m.expiration_date) return false;
    return new Date(m.expiration_date).getFullYear() > currentYear;
  }).length;

  const yetToRenew = members.filter((m) => {
    if (m.current_standing !== "Active") return false;
    if (!m.expiration_date) return false;
    return new Date(m.expiration_date).getFullYear() === currentYear;
  }).length;

  const newThisYear = members.filter((m) => {
    if (!m.date_added) return false;
    return new Date(m.date_added).getFullYear() === currentYear;
  }).length;

  const inactive = members.filter((m) => {
    if (m.current_standing !== "Active") return true;
    if (m.expiration_date && new Date(m.expiration_date) < new Date()) return true;
    return false;
  }).length;

  // Chart data — renewals by month from UDF1
  const monthCounts = new Array(12).fill(0);
  members.forEach((m) => {
    const date = parseUdf1PaymentDate(m.udf1_text);
    if (date && date.getFullYear() === currentYear) {
      monthCounts[date.getMonth()]++;
    }
  });

  // Cumulative good standing over months
  // Base = members already good standing without a UDF1 payment this year
  // Each month adds renewals from that month
  const baseGoodStanding = members.filter((m) => {
    if (m.current_standing !== "Active") return false;
    if (!m.expiration_date) return false;
    if (new Date(m.expiration_date).getFullYear() <= currentYear) return false;
    // Exclude those who renewed this year (they'll be added month by month)
    const payDate = parseUdf1PaymentDate(m.udf1_text);
    return !(payDate && payDate.getFullYear() === currentYear);
  }).length;

  const standingData = MONTHS.map((month, i) => {
    if (i > lastImportMonth) return { month, total: null };
    const cumulative = baseGoodStanding + monthCounts.slice(0, i + 1).reduce((a, b) => a + b, 0);
    return { month, total: cumulative };
  });

  const chartData = MONTHS.map((month, i) => ({ month, renewed: i > lastImportMonth ? null : monthCounts[i] }));

  // New members by month
  const newMemberMonthCounts = new Array(12).fill(0);
  members.forEach((m) => {
    if (!m.date_added) return;
    const d = new Date(m.date_added);
    if (d.getFullYear() === currentYear) {
      newMemberMonthCounts[d.getMonth()]++;
    }
  });
  const newMembersData = MONTHS.map((month, i) => ({ month, newMembers: i > lastImportMonth ? null : newMemberMonthCounts[i] }));

  // Inactive members over time from snapshot data
  // Group by month, take the latest import per month
  const inactiveByMonth = (() => {
    const monthMap = new Map<string, { inactive: number }>();
    inactiveByImport.forEach((row) => {
      const d = new Date(row.imported_at);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      // Latest import per month wins (data is ordered by imported_at)
      monthMap.set(key, { inactive: Number(row.inactive_count) });
    });
    return MONTHS.map((month, i) => {
      const key = `${currentYear}-${String(i).padStart(2, "0")}`;
      const entry = monthMap.get(key);
      return { month, inactive: entry ? entry.inactive : null };
    });
  })();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        Loading statistics...
      </div>
    );
  }

  const kpis = [
    { label: "Good Standing", value: goodStanding, icon: UserCheck, color: "text-green-600" },
    { label: "Yet to Renew", value: yetToRenew, icon: Users, color: "text-amber-600" },
    { label: "New This Year", value: newThisYear, icon: UserPlus, color: "text-blue-600" },
    { label: "Inactive", value: inactive, icon: UserX, color: "text-destructive" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Membership Statistics</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4 flex flex-col items-center text-center gap-1">
              <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
              <span className="text-2xl font-bold">{kpi.value}</span>
              <span className="text-xs text-muted-foreground">{kpi.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Renewals Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Members Renewed by Month — {currentYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="renewed" fill="var(--color-renewed)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Good Standing Over Time Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Members in Good Standing Over Time — {currentYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={standingChartConfig} className="h-[300px] w-full">
            <LineChart data={standingData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="total" stroke="var(--color-total)" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* New Members by Month Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            New Members by Month — {currentYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={newMembersChartConfig} className="h-[300px] w-full">
            <BarChart data={newMembersData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="newMembers" fill="var(--color-newMembers)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Flagged Payment Entries */}
      <FlaggedPaymentEntries members={members} />
    </div>
  );
}

type MemberRow = { first_name: string | null; last_name: string | null; udf1_text: string | null; current_standing: string | null; expiration_date: string | null };

function FlaggedPaymentEntries({ members }: { members: MemberRow[] }) {
  const [open, setOpen] = useState(false);
  const today = new Date();

  const flagged: { name: string; entry: string; reason: string }[] = [];

  members.forEach((m) => {
    // Skip inactive members
    if (m.current_standing !== "Active") return;
    if (m.expiration_date && new Date(m.expiration_date) < new Date()) return;

    const raw = m.udf1_text;
    if (!raw || !raw.trim()) return;

    const name = [m.first_name, m.last_name].filter(Boolean).join(" ") || "Unknown";
    const parsed = parseUdf1PaymentDate(raw);

    if (!parsed) {
      flagged.push({ name, entry: raw, reason: "Malformed date — could not parse" });
    } else if (parsed > today) {
      flagged.push({ name, entry: raw, reason: "Date is in the future" });
    }
  });

  if (flagged.length === 0) return null;

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Flagged Payment Entries ({flagged.length})
            </CardTitle>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-3 py-2 font-medium">Member</th>
                    <th className="text-left px-3 py-2 font-medium">Payment Entry</th>
                    <th className="text-left px-3 py-2 font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {flagged.map((f, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-3 py-2">{f.name}</td>
                      <td className="px-3 py-2 font-mono text-xs">{f.entry}</td>
                      <td className="px-3 py-2 text-muted-foreground">{f.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
