import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  ALL_QUESTIONS,
  OPEN_TEXT_QUESTIONS,
  SURVEY_KEY,
  SURVEY_SECTIONS,
  type SurveyQuestion,
} from "@/lib/survey/questions";

interface ResponseRow {
  id: string;
  answers: Record<string, unknown>;
  submitted_at: string;
}

const ALL_PERSONAS = "all";

export default function SurveyResults() {
  const { user, loading: authLoading, isOfficerOrAbove } = useAuth();
  const [persona, setPersona] = useState<string>(ALL_PERSONAS);

  const { data: responses = [], isLoading } = useQuery({
    queryKey: ["survey-responses", SURVEY_KEY],
    enabled: !!user && isOfficerOrAbove,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("survey_responses" as any)
        .select("id, answers, submitted_at")
        .eq("survey_key", SURVEY_KEY)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return data as unknown as ResponseRow[];
    },
  });

  const personaOptions = useMemo(() => {
    const q2 = ALL_QUESTIONS.find((q) => q.id === "q2");
    return q2?.options ?? [];
  }, []);

  const filtered = useMemo(() => {
    if (persona === ALL_PERSONAS) return responses;
    return responses.filter((r) => r.answers?.q2 === persona);
  }, [responses, persona]);

  const metrics = useMemo(() => computeMetrics(filtered), [filtered]);

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!isOfficerOrAbove) return <Navigate to="/home" replace />;

  function handleExport() {
    const csv = buildCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `new-member-survey-2026-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export downloaded", description: `${filtered.length} response${filtered.length === 1 ? "" : "s"}.` });
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <ClipboardList className="h-6 w-6 text-accent" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">New Member Survey — Class of 2026</h1>
          <p className="text-sm text-muted-foreground">
            {responses.length} response{responses.length === 1 ? "" : "s"} collected
            {persona !== ALL_PERSONAS ? ` (${filtered.length} in this view)` : ""}
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={filtered.length === 0} className="min-h-[44px]">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Cut by primary persona:</span>
        <Select value={persona} onValueChange={setPersona}>
          <SelectTrigger className="w-full max-w-sm min-h-[44px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_PERSONAS}>All respondents</SelectItem>
            {personaOptions.map((p) => (
              <SelectItem key={p} value={p}>
                {p.split("—")[0].trim()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading responses…</p>
      ) : responses.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No responses yet. Share the survey link with the 2026 class to get started.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Headline metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <MetricCard label="Onboarding score" value={metrics.onboardingScore} hint="Avg of Q19 statements (1–5)" />
            <MetricCard label="Renewal intent" value={metrics.renewalIntent} hint="Q24 Definitely / Probably" />
            <MetricCard label="Recommend (NPS)" value={metrics.nps} hint="Q25, −100 to +100" />
            <MetricCard label="Website satisfaction" value={metrics.websiteSat} hint="Q13 avg (1–5)" />
            <MetricCard label="Connect satisfaction" value={metrics.connectSat} hint="Q13 avg (1–5)" />
            <MetricCard label="Newsletter satisfaction" value={metrics.newsletterSat} hint="Q13 avg (1–5)" />
          </div>

          {metrics.volunteerPool.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Volunteer pool (Q26)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {metrics.volunteerPool.map(([label, count]) => (
                  <BarRow key={label} label={label} count={count} total={filtered.length} />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Per-question breakdowns */}
          {SURVEY_SECTIONS.map((section) => (
            <Card key={section.title}>
              <CardHeader>
                <CardTitle className="text-base font-semibold">{section.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                {section.questions.map((q) => (
                  <QuestionBreakdown key={q.id} q={q} responses={filtered} />
                ))}
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}

/* ---------- metrics ---------- */

function scaleValue(q: SurveyQuestion, label: string): number | null {
  if (!q.scaleLabels) return null;
  const idx = (q.columns ?? []).indexOf(label);
  return idx >= 0 ? idx + 1 : null;
}

function avg(nums: number[]): number | null {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}

function computeMetrics(rows: ResponseRow[]) {
  const q19 = ALL_QUESTIONS.find((q) => q.id === "q19")!;
  const onboarding = avg(
    rows.flatMap((r) => {
      const g = (r.answers?.q19 ?? {}) as Record<string, string>;
      return (q19.rows ?? [])
        .map((row) => scaleValue(q19, g[row]))
        .filter((v): v is number => v !== null);
    })
  );

  const q24Answers = rows.map((r) => r.answers?.q24).filter((v): v is string => typeof v === "string");
  const renewers = q24Answers.filter((v) => v === "Definitely" || v === "Probably").length;

  const npsVals = rows
    .map((r) => Number(r.answers?.q25))
    .filter((v) => !Number.isNaN(v) && v >= 0 && v <= 10);
  const promoters = npsVals.filter((v) => v >= 9).length;
  const detractors = npsVals.filter((v) => v <= 6).length;
  const nps = npsVals.length ? Math.round(((promoters - detractors) / npsVals.length) * 100) : null;

  const q13 = ALL_QUESTIONS.find((q) => q.id === "q13")!;
  const rowAvg = (rowName: string) =>
    avg(
      rows
        .map((r) => scaleValue(q13, ((r.answers?.q13 ?? {}) as Record<string, string>)[rowName]))
        .filter((v): v is number => v !== null)
    );

  const q26 = ALL_QUESTIONS.find((q) => q.id === "q26")!;
  const counts = new Map<string, number>();
  for (const r of rows) {
    const sel = Array.isArray(r.answers?.q26) ? (r.answers.q26 as string[]) : [];
    for (const s of sel) counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  const volunteerPool = (q26.options ?? [])
    .map((opt): [string, number] => [opt, counts.get(opt) ?? 0])
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1]);

  return {
    onboardingScore: onboarding === null ? "—" : onboarding.toFixed(1),
    renewalIntent: q24Answers.length ? `${Math.round((renewers / q24Answers.length) * 100)}%` : "—",
    nps: nps === null ? "—" : String(nps),
    websiteSat: rowAvg("Chapter website")?.toFixed(1) ?? "—",
    connectSat: rowAvg("Chapter84 Connect")?.toFixed(1) ?? "—",
    newsletterSat: rowAvg("Monthly newsletter")?.toFixed(1) ?? "—",
    volunteerPool,
  };
}

/* ---------- rendering ---------- */

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>
      </CardContent>
    </Card>
  );
}

function BarRow({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between gap-3 text-sm">
        <span className="text-foreground leading-snug">{label}</span>
        <span className="text-muted-foreground tabular-nums shrink-0">
          {count} · {pct}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function QuestionBreakdown({ q, responses }: { q: SurveyQuestion; responses: ResponseRow[] }) {
  const total = responses.length;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground leading-relaxed">
        <span className="text-muted-foreground mr-1.5">{q.id.slice(1)}.</span>
        {q.text}
      </p>

      {q.type === "open" && (
        <OpenAnswers id={q.id} responses={responses} highlight={OPEN_TEXT_QUESTIONS.includes(q.id)} />
      )}

      {(q.type === "single" || q.type === "multi") && (
        <ChoiceBreakdown q={q} responses={responses} total={total} />
      )}

      {q.type === "nps" && <NpsBreakdown responses={responses} />}

      {q.type === "grid" && <GridBreakdown q={q} responses={responses} />}
    </div>
  );
}

function ChoiceBreakdown({ q, responses, total }: { q: SurveyQuestion; responses: ResponseRow[]; total: number }) {
  const counts = new Map<string, number>();
  for (const r of responses) {
    const v = r.answers?.[q.id];
    const picks = Array.isArray(v) ? v : typeof v === "string" ? [v] : [];
    for (const p of picks) counts.set(String(p), (counts.get(String(p)) ?? 0) + 1);
  }
  const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (rows.length === 0) return <p className="text-xs text-muted-foreground italic">No answers yet.</p>;
  return (
    <div className="space-y-2">
      {rows.map(([label, count]) => (
        <BarRow key={label} label={label} count={count} total={total} />
      ))}
    </div>
  );
}

function NpsBreakdown({ responses }: { responses: ResponseRow[] }) {
  const counts = new Array(11).fill(0) as number[];
  let answered = 0;
  for (const r of responses) {
    const v = Number(r.answers?.q25);
    if (!Number.isNaN(v) && v >= 0 && v <= 10) {
      counts[v]++;
      answered++;
    }
  }
  if (answered === 0) return <p className="text-xs text-muted-foreground italic">No answers yet.</p>;
  return (
    <div className="flex items-end gap-1">
      {counts.map((c, n) => (
        <div key={n} className="flex flex-col items-center gap-1 flex-1 min-w-0">
          <span className="text-[10px] text-muted-foreground tabular-nums">{c || ""}</span>
          <div
            className={`w-full rounded-sm ${n >= 9 ? "bg-[hsl(var(--success))]" : n <= 6 ? "bg-destructive/60" : "bg-muted-foreground/40"}`}
            style={{ height: `${Math.max(4, (c / Math.max(...counts, 1)) * 48)}px` }}
          />
          <span className="text-[10px] text-muted-foreground tabular-nums">{n}</span>
        </div>
      ))}
    </div>
  );
}

function GridBreakdown({ q, responses }: { q: SurveyQuestion; responses: ResponseRow[] }) {
  return (
    <div className="space-y-4">
      {(q.rows ?? []).map((row) => {
        const counts = new Map<string, number>();
        let answered = 0;
        for (const r of responses) {
          const v = ((r.answers?.[q.id] ?? {}) as Record<string, string>)[row];
          if (v) {
            counts.set(v, (counts.get(v) ?? 0) + 1);
            answered++;
          }
        }
        const scaleVals = q.scaleLabels
          ? responses
              .map((r) => scaleValue(q, ((r.answers?.[q.id] ?? {}) as Record<string, string>)[row]))
              .filter((v): v is number => v !== null)
          : [];
        const rowAvgValue = q.scaleLabels ? avg(scaleVals) : null;

        return (
          <div key={row} className="rounded-md border border-border p-3 space-y-2">
            <div className="flex justify-between gap-3">
              <p className="text-sm text-foreground leading-snug">{row}</p>
              {rowAvgValue !== null && (
                <span className="text-sm font-semibold text-foreground tabular-nums shrink-0">
                  {rowAvgValue.toFixed(1)} avg
                </span>
              )}
            </div>
            {answered === 0 ? (
              <p className="text-xs text-muted-foreground italic">No answers yet.</p>
            ) : (
              <div className="space-y-1.5">
                {[...(q.columns ?? []), ...(q.allowNA ? ["N/A"] : [])]
                  .filter((col) => (counts.get(col) ?? 0) > 0)
                  .map((col) => (
                    <BarRow key={col} label={col} count={counts.get(col) ?? 0} total={answered} />
                  ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function OpenAnswers({ id, responses, highlight }: { id: string; responses: ResponseRow[]; highlight: boolean }) {
  const items = responses
    .map((r) => r.answers?.[id])
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  if (items.length === 0) return <p className="text-xs text-muted-foreground italic">No answers yet.</p>;
  return (
    <ul className="space-y-2">
      {items.map((text, i) => (
        <li
          key={i}
          className={`text-sm text-foreground leading-relaxed rounded-md border p-3 ${
            highlight ? "border-border bg-muted/40" : "border-border"
          }`}
        >
          {text}
        </li>
      ))}
    </ul>
  );
}

/* ---------- CSV export ---------- */

function csvCell(v: string): string {
  return `"${v.replace(/"/g, '""')}"`;
}

function buildCsv(rows: ResponseRow[]): string {
  const headers: string[] = ["submitted_at"];
  for (const q of ALL_QUESTIONS) {
    if (q.type === "grid") {
      for (const row of q.rows ?? []) headers.push(`${q.id}: ${row}`);
    } else {
      headers.push(`${q.id}: ${q.text}`);
    }
  }

  const lines = [headers.map(csvCell).join(",")];
  for (const r of rows) {
    const cells: string[] = [r.submitted_at];
    for (const q of ALL_QUESTIONS) {
      const v = r.answers?.[q.id];
      if (q.type === "grid") {
        const g = (v ?? {}) as Record<string, string>;
        for (const row of q.rows ?? []) cells.push(g[row] ?? "");
      } else if (Array.isArray(v)) {
        cells.push(v.join(" | "));
      } else {
        cells.push(v === undefined || v === null ? "" : String(v));
      }
    }
    lines.push(cells.map(csvCell).join(","));
  }
  return lines.join("\r\n");
}
