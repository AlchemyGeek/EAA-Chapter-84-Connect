import { useState } from "react";
import { QUALIFICATION_SECTIONS, parseRatings, serializeRatings } from "@/lib/qualifications";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function QualificationsPicker({ value, onChange, disabled }: Props) {
  const initial = parseRatings(value);
  const [selected, setSelected] = useState<string[]>(initial.selected);
  const [otherText, setOtherText] = useState(initial.other.join(", "));

  const emit = (sel: string[], other: string) =>
    onChange(serializeRatings({ selected: sel, other: other.split(",") }));

  const toggle = (token: string, single?: boolean, sectionTokens: string[] = []) => {
    let next: string[];
    if (selected.includes(token)) next = selected.filter((t) => t !== token);
    else if (single) next = [...selected.filter((t) => !sectionTokens.includes(t)), token];
    else next = [...selected, token];
    setSelected(next);
    emit(next, otherText);
  };

  return (
    <div className="space-y-4">
      {QUALIFICATION_SECTIONS.map((section) => (
        <fieldset key={section.key}>
          <legend className="text-xs text-muted-foreground mb-1.5">
            {section.label}{section.single ? " (pick one)" : ""}
          </legend>
          <div className="flex flex-wrap gap-2">
            {section.tokens.map((t) => {
              const on = selected.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={on}
                  disabled={disabled}
                  onClick={() => toggle(t, section.single, section.tokens)}
                  className={`min-h-[44px] rounded-full border px-3 text-base transition-colors ${
                    on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
      <div>
        <Label htmlFor="ratings-other" className="text-xs text-muted-foreground">Other (comma-separated)</Label>
        <Input
          id="ratings-other"
          value={otherText}
          disabled={disabled}
          placeholder="e.g. Tailwheel, High Performance"
          onChange={(e) => { setOtherText(e.target.value); emit(selected, e.target.value); }}
          className="mt-1"
        />
      </div>
    </div>
  );
}
