import { useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2 } from "lucide-react";
import chapterLogo from "@/assets/chapter-logo.jpg";
import imgWelcome from "@/assets/debrief-01-welcome.png.asset.json";
import imgAboutYou from "@/assets/debrief-02-about-you.png.asset.json";
import imgActivities from "@/assets/debrief-03-activities.png.asset.json";
import imgResources from "@/assets/debrief-04-resources.png.asset.json";
import imgOnboarding from "@/assets/debrief-05-onboarding.png.asset.json";
import imgLookingAhead from "@/assets/debrief-06-looking-ahead.png.asset.json";

/** Section illustrations, matched by keyword in the section title. */
const SECTION_IMAGES: { match: string; src: string; alt: string }[] = [
  { match: "About You", src: imgAboutYou.url, alt: "Pilot filling out a name tag" },
  { match: "Activities", src: imgActivities.url, alt: "Pilot with a wrench and a burger on a stick" },
  { match: "Resources", src: imgResources.url, alt: "Pilot puzzling over a tablet and cables" },
  { match: "Onboarding", src: imgOnboarding.url, alt: "Pilot in a seat checking off a clipboard" },
  { match: "Looking Ahead", src: imgLookingAhead.url, alt: "Pilot looking through a telescope at a runway sign" },
];

function sectionImage(title: string) {
  return SECTION_IMAGES.find((s) => title.includes(s.match));
}
import {
  ALL_QUESTIONS,
  SURVEY_INTRO_BODY,
  SURVEY_INTRO_TITLE,
  SURVEY_KEY,
  SURVEY_SECTIONS,
  type SurveyQuestion,
} from "@/lib/survey/questions";

type Answers = Record<string, unknown>;

const SUBMITTED_KEY = `survey-submitted-${SURVEY_KEY}`;
const OTHER = "Other";

export default function Survey() {
  const [answers, setAnswers] = useState<Answers>({});
  const [otherText, setOtherText] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(SUBMITTED_KEY) === "1"
  );
  const startedAt = useRef(Date.now());
  const honeypot = useRef("");

  const missingRequired = useMemo(() => {
    return ALL_QUESTIONS.filter((q) => q.required && !isAnswered(q, answers[q.id]));
  }, [answers]);

  function setAnswer(id: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function toggleMulti(q: SurveyQuestion, option: string) {
    const current = Array.isArray(answers[q.id]) ? ([...(answers[q.id] as string[])]) : [];
    const idx = current.indexOf(option);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      if (q.maxPicks && current.length >= q.maxPicks) {
        toast({ title: `Pick up to ${q.maxPicks}`, description: "Remove one to choose another." });
        return;
      }
      current.push(option);
    }
    setAnswer(q.id, current);
  }

  function setGrid(q: SurveyQuestion, row: string, column: string) {
    const current = (answers[q.id] as Record<string, string>) ?? {};
    setAnswer(q.id, { ...current, [row]: column });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Bot filters: hidden field filled, or impossibly fast completion.
    if (honeypot.current) return;
    if (Date.now() - startedAt.current < 5000) {
      toast({ title: "Please take a moment to review your answers", variant: "destructive" });
      return;
    }

    if (missingRequired.length > 0) {
      const first = missingRequired[0];
      toast({
        title: "Some required questions are unanswered",
        description: `Question ${first.id.slice(1)} needs an answer.`,
        variant: "destructive",
      });
      document.getElementById(`survey-${first.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);
    try {
      // Fold "Other: ____" free text into the answers.
      const finalAnswers: Answers = {};
      for (const q of ALL_QUESTIONS) {
        let value = answers[q.id];
        if ((q.type === "single" || q.type === "multi") && q.allowOther && value) {
          const extra = otherText[q.id]?.trim();
          const replace = (v: string) => (v === OTHER ? (extra ? `Other: ${extra}` : "Other") : v);
          value = Array.isArray(value) ? value.map(replace) : value === OTHER ? replace(OTHER) : value;
        }
        if (value !== undefined && value !== "" && !(Array.isArray(value) && value.length === 0)) {
          finalAnswers[q.id] = value;
        }
      }

      const { error } = await supabase.from("survey_responses" as any).insert({
        survey_key: SURVEY_KEY,
        answers: finalAnswers,
      } as any);
      if (error) throw error;

      localStorage.setItem(SUBMITTED_KEY, "1");
      setSubmitted(true);
      window.scrollTo({ top: 0 });
    } catch (err: any) {
      toast({ title: "Error submitting survey", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-lg w-full text-center">
          <CardContent className="py-12 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-[hsl(var(--success))] mx-auto" />
            <h2 className="text-2xl font-bold text-foreground">Thank you!</h2>
            <p className="text-muted-foreground">
              Your response has been recorded. It goes to the board as part of a group summary — no
              names attached unless you chose to share yours.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        {/* Branding */}
        <div className="flex items-center gap-4">
          <img src={chapterLogo} alt="EAA Chapter 84" className="h-14 w-14 rounded-full ring-2 ring-border" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">EAA Chapter 84</h1>
            <p className="text-sm text-muted-foreground">2026 New Member Survey — Class of 2026</p>
          </div>
        </div>

        {/* Intro */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-1.5">
              <CardTitle className="text-lg font-semibold text-foreground">{SURVEY_INTRO_TITLE}</CardTitle>
            </div>
            <img src={imgWelcome.url} alt="Welcoming pilot waving" className="h-24 w-auto shrink-0" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">{SURVEY_INTRO_BODY}</p>
            <p className="text-xs text-muted-foreground mt-4">
              Questions marked <span className="text-accent font-semibold">★</span> are required; everything
              else can be skipped.
            </p>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Honeypot — invisible to humans */}
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute -left-[9999px] h-0 w-0 opacity-0"
            onChange={(e) => (honeypot.current = e.target.value)}
          />

          {SURVEY_SECTIONS.map((section) => (
            <Card key={section.title}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <CardTitle className="text-lg font-semibold text-foreground pt-1">{section.title}</CardTitle>
                {(() => {
                  const img = sectionImage(section.title);
                  return img ? (
                    <img src={img.src} alt={img.alt} className="h-24 w-auto shrink-0" aria-hidden="true" />
                  ) : null;
                })()}
              </CardHeader>
              <CardContent className="space-y-8">
                {section.questions.map((q) => (
                  <div key={q.id} id={`survey-${q.id}`} className="space-y-3">
                    <p className="text-sm font-medium text-foreground leading-relaxed">
                      <span className="text-muted-foreground mr-1.5">{q.id.slice(1)}.</span>
                      {q.required && <span className="text-accent font-semibold mr-1">★</span>}
                      {q.text}
                    </p>
                    <QuestionInput
                      q={q}
                      value={answers[q.id]}
                      otherValue={otherText[q.id] ?? ""}
                      onSingle={(v) => setAnswer(q.id, v)}
                      onMulti={(opt) => toggleMulti(q, opt)}
                      onOpen={(v) => setAnswer(q.id, v)}
                      onGrid={(row, col) => setGrid(q, row, col)}
                      onOtherText={(v) => setOtherText((prev) => ({ ...prev, [q.id]: v }))}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}

          <div className="flex flex-col items-center gap-3 pt-2 pb-10">
            <Button type="submit" disabled={submitting} className="w-full sm:w-auto min-h-[44px]">
              {submitting ? "Submitting..." : "Submit Survey"}
            </Button>
            {missingRequired.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {missingRequired.length} required question{missingRequired.length === 1 ? "" : "s"} still
                unanswered.
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function isAnswered(q: SurveyQuestion, value: unknown): boolean {
  if (value === undefined || value === null || value === "") return false;
  if (q.type === "multi") return Array.isArray(value) && value.length > 0;
  if (q.type === "grid") {
    const obj = value as Record<string, string>;
    return (q.rows ?? []).every((row) => !!obj?.[row]);
  }
  return true;
}

function QuestionInput({
  q,
  value,
  otherValue,
  onSingle,
  onMulti,
  onOpen,
  onGrid,
  onOtherText,
}: {
  q: SurveyQuestion;
  value: unknown;
  otherValue: string;
  onSingle: (v: string) => void;
  onMulti: (option: string) => void;
  onOpen: (v: string) => void;
  onGrid: (row: string, col: string) => void;
  onOtherText: (v: string) => void;
}) {
  if (q.type === "open") {
    return q.multiline ? (
      <Textarea
        value={(value as string) ?? ""}
        onChange={(e) => onOpen(e.target.value)}
        rows={3}
        maxLength={2000}
        className="text-base"
      />
    ) : (
      <Input
        value={(value as string) ?? ""}
        onChange={(e) => onOpen(e.target.value)}
        maxLength={300}
        className="text-base min-h-[44px]"
      />
    );
  }

  if (q.type === "nps") {
    const selected = value !== undefined && value !== "" && value !== null ? Number(value) : undefined;
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 11 }, (_, n) => (
            <button
              key={n}
              type="button"
              onClick={() => onSingle(String(n))}
              className={`h-11 w-11 rounded-md border text-sm font-medium transition-colors ${
                selected === n
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-muted"
              }`}
              aria-pressed={selected === n}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground max-w-md">
          <span>Not at all likely</span>
          <span>Extremely likely</span>
        </div>
      </div>
    );
  }

  if (q.type === "single") {
    const options = [...(q.options ?? []), ...(q.allowOther ? [OTHER] : [])];
    return (
      <div className="space-y-1.5">
        {options.map((opt) => {
          const checked = value === opt;
          return (
            <div key={opt}>
              <Label
                className={`flex items-center gap-3 rounded-md border px-3 py-2.5 min-h-[44px] cursor-pointer transition-colors text-sm font-normal ${
                  checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/60"
                }`}
              >
                <input
                  type="radio"
                  name={q.id}
                  checked={checked}
                  onChange={() => onSingle(opt)}
                  className="h-4 w-4 shrink-0"
                />
                <span className="leading-snug">{opt}</span>
              </Label>
              {opt === OTHER && checked && (
                <Input
                  value={otherValue}
                  onChange={(e) => onOtherText(e.target.value)}
                  placeholder="Please specify"
                  maxLength={200}
                  className="mt-2 text-base min-h-[44px]"
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (q.type === "multi") {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    const options = [...(q.options ?? []), ...(q.allowOther ? [OTHER] : [])];
    return (
      <div className="space-y-1.5">
        {q.maxPicks && (
          <p className="text-xs text-muted-foreground">
            {selected.length} of {q.maxPicks} selected
          </p>
        )}
        {options.map((opt) => {
          const checked = selected.includes(opt);
          return (
            <div key={opt}>
              <Label
                className={`flex items-center gap-3 rounded-md border px-3 py-2.5 min-h-[44px] cursor-pointer transition-colors text-sm font-normal ${
                  checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/60"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onMulti(opt)}
                  className="h-4 w-4 shrink-0"
                />
                <span className="leading-snug">{opt}</span>
              </Label>
              {opt === OTHER && checked && (
                <Input
                  value={otherValue}
                  onChange={(e) => onOtherText(e.target.value)}
                  placeholder="Please specify"
                  maxLength={200}
                  className="mt-2 text-base min-h-[44px]"
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // grid
  const grid = (value as Record<string, string>) ?? {};
  const columns = [...(q.columns ?? []), ...(q.allowNA ? ["N/A"] : [])];
  return (
    <div className="space-y-4">
      {q.scaleLabels && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1 = {q.scaleLabels[0]}</span>
          <span>5 = {q.scaleLabels[1]}</span>
        </div>
      )}
      {(q.rows ?? []).map((row) => (
        <div key={row} className="rounded-md border border-border p-3 space-y-2">
          <p className="text-sm text-foreground leading-snug">{row}</p>
          {q.rowLinks?.[row] && (
            <a
              href={q.rowLinks[row]}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs text-primary underline underline-offset-2"
            >
              Learn more
            </a>
          )}
          <div className="flex flex-wrap gap-1.5">
            {columns.map((col, i) => {
              const label = q.scaleLabels && col !== "N/A" ? String(i + 1) : col;
              const checked = grid[row] === col;
              return (
                <button
                  key={col}
                  type="button"
                  onClick={() => onGrid(row, col)}
                  aria-pressed={checked}
                  title={col}
                  className={`rounded-md border px-3 min-h-[44px] text-sm transition-colors ${
                    checked
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {q.scaleLabels && grid[row] && (
            <p className="text-xs text-muted-foreground">{grid[row]}</p>
          )}
        </div>
      ))}
    </div>
  );
}
