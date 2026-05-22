import { useState, type KeyboardEvent } from "react";
import { Link2, X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MAX_LINKS } from "@/lib/classifieds/types";

interface Props {
  value: string[];
  onChange: (links: string[]) => void;
}

function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withScheme);
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function LinksInput({ value, onChange }: Props) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const add = () => {
    const url = normalizeUrl(draft);
    if (!url) {
      setError("Please enter a valid URL.");
      return;
    }
    if (value.includes(url)) {
      setError("This link is already added.");
      return;
    }
    if (value.length >= MAX_LINKS) {
      setError(`Maximum of ${MAX_LINKS} links.`);
      return;
    }
    onChange([...value, url]);
    setDraft("");
    setError(null);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      add();
    }
  };

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul className="space-y-1">
          {value.map((url) => (
            <li
              key={url}
              className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm"
            >
              <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">{url}</span>
              <button
                type="button"
                aria-label="Remove link"
                onClick={() => onChange(value.filter((u) => u !== url))}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          onKeyDown={onKeyDown}
          placeholder="https://example.com"
          disabled={value.length >= MAX_LINKS}
        />
        <Button
          type="button"
          variant="outline"
          onClick={add}
          disabled={!draft.trim() || value.length >= MAX_LINKS}
        >
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        {value.length}/{MAX_LINKS} links.
      </p>
    </div>
  );
}
