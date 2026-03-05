import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from "recharts";
import { Users, UserCheck, UserX, UserPlus } from "lucide-react";

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

export default function MembershipStatistics() {
  const currentYear = new Date().getFullYear();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["membership-stats-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roster_members")
        .select("current_standing, expiration_date, date_added, udf1_text");
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
    const cumulative = baseGoodStanding + monthCounts.slice(0, i + 1).reduce((a, b) => a + b, 0);
    return { month, total: cumulative };
  });

  const chartData = MONTHS.map((month, i) => ({ month, renewed: monthCounts[i] }));

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
    </div>
  );
}
