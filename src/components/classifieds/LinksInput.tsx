import { useState, type KeyboardEvent } from "react";
import { Link2, X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MAX_LINKS, type ClassifiedLink } from "@/lib/classifieds/types";

interface Props {
  value: ClassifiedLink[];
  onChange: (links: ClassifiedLink[]) => void;
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
  const [draftLabel, setDraftLabel] = useState("");
  const [draftUrl, setDraftUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const add = () => {
    const url = normalizeUrl(draftUrl);
    if (!url) {
      setError("Please enter a valid URL.");
      return;
    }
    if (value.some((l) => l.url === url)) {
      setError("This link is already added.");
      return;
    }
    if (value.length >= MAX_LINKS) {
      setError(`Maximum of ${MAX_LINKS} links.`);
      return;
    }
    const label = draftLabel.trim() || url;
    onChange([...value, { url, label }]);
    setDraftLabel("");
    setDraftUrl("");
    setError(null);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      add();
    }
  };

  const updateLabel = (idx: number, label: string) => {
    const next = value.map((l, i) => (i === idx ? { ...l, label } : l));
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((link, i) => (
            <li
              key={link.url}
              className="rounded-md border bg-muted/30 p-3 space-y-2"
            >
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate text-xs text-muted-foreground">
                  {link.url}
                </span>
                <button
                  type="button"
                  aria-label="Remove link"
                  onClick={() => onChange(value.filter((_, j) => j !== i))}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <Input
                value={link.label}
                onChange={(e) => updateLabel(i, e.target.value)}
                placeholder="Description (e.g. Manufacturer page)"
              />
            </li>
          ))}
        </ul>
      )}
      <div className="space-y-2 rounded-md border border-dashed p-3">
        <Input
          value={draftLabel}
          onChange={(e) => {
            setDraftLabel(e.target.value);
            setError(null);
          }}
          placeholder="Description (optional)"
          disabled={value.length >= MAX_LINKS}
        />
        <div className="flex gap-2">
          <Input
            value={draftUrl}
            onChange={(e) => {
              setDraftUrl(e.target.value);
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
            disabled={!draftUrl.trim() || value.length >= MAX_LINKS}
          >
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        {value.length}/{MAX_LINKS} links. Description shown to readers — defaults
        to the URL if left blank.
      </p>
    </div>
  );
}
