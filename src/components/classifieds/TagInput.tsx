import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { normalizeTag, type Tag } from "@/lib/classifieds/types";

interface Props {
  value: Tag[];
  onChange: (tags: Tag[]) => void;
  max?: number;
  placeholder?: string;
}

export function TagInput({ value, onChange, max = 10, placeholder }: Props) {
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const t = normalizeTag(raw);
    if (!t) return;
    if (value.length >= max) return;
    if (value.some((v) => v.toLowerCase() === t.toLowerCase())) return;
    onChange([...value, t]);
    setDraft("");
  };

  const remove = (t: Tag) => onChange(value.filter((x) => x !== t));

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      if (draft.trim()) {
        e.preventDefault();
        add(draft);
      }
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary px-3 py-1 text-sm text-primary-foreground"
          >
            {t}
            <button
              type="button"
              aria-label={`Remove ${t}`}
              onClick={() => remove(t)}
              className="-mr-1 inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-primary-foreground/20"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => draft.trim() && add(draft)}
        placeholder={
          placeholder ??
          (value.length >= max
            ? `Maximum ${max} tags`
            : "Type a tag and press Enter or comma")
        }
        disabled={value.length >= max}
      />
      <p className="text-xs text-muted-foreground">
        {value.length}/{max} tags. Tags are automatically capitalized.
      </p>
    </div>
  );
}
