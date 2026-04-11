import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { Activity, Users, TrendingUp, Star, Moon, MousePointerClick } from "lucide-react";

const trendChartConfig = {
  active_members: {
    label: "Active Members",
    color: "hsl(var(--primary))",
  },
};

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

  const engagementRate =
    kpis && kpis.total_active_members > 0
      ? Math.round((Number(kpis.active_30d) / Number(kpis.total_active_members)) * 100)
      : 0;

  const kpiCards = [
    { label: "Active (30d)", value: kpis?.active_30d ?? "—", icon: Users, color: "text-primary" },
    { label: "Weekly Active", value: kpis?.active_7d ?? "—", icon: TrendingUp, color: "text-chart-2" },
    { label: "Engagement Rate", value: kpis ? `${engagementRate}%` : "—", icon: Activity, color: "text-chart-3" },
    { label: "Highly Engaged", value: kpis?.highly_engaged_30d ?? "—", icon: Star, color: "text-chart-4" },
    { label: "Dormant (60d)", value: kpis?.dormant_60d ?? "—", icon: Moon, color: "text-muted-foreground" },
    { label: "Service Views (30d)", value: kpis?.service_page_views_30d ?? "—", icon: MousePointerClick, color: "text-chart-5" },
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
              <CardContent className="p-4 flex flex-col items-center text-center gap-1">
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
    </div>
  );
}
