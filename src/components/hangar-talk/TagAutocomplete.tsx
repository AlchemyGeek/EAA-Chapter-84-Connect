import { useMemo, useState, useRef, useEffect } from "react";
import { X, Plus } from "lucide-react";
import { useTags, useCreateTag, type TagRow } from "@/lib/hangarTalk/api";
import { toast } from "sonner";

/**
 * Free-form tag picker. Type to filter existing tags or create a new one.
 * Selected tags appear as chips with a remove button.
 */
export function TagAutocomplete({
  selected,
  onChange,
  placeholder = "Type to add a tag…",
  maxTags = 10,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  maxTags?: number;
}) {
  const { data: allTags = [] } = useTags();
  const createTag = useCreateTag();
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const tagById = useMemo(() => {
    const m = new Map<string, TagRow>();
    for (const t of allTags) m.set(t.id, t);
    return m;
  }, [allTags]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const suggestions = useMemo(() => {
    const q = input.trim().toLowerCase();
    if (!q) {
      // Show top unselected tags alphabetically
      return allTags
        .filter((t) => !selectedSet.has(t.id))
        .slice()
        .sort((a, b) => a.label.localeCompare(b.label))
        .slice(0, 8);
    }
    return allTags
      .filter(
        (t) => !selectedSet.has(t.id) && t.label.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [allTags, input, selectedSet]);

  const exactMatch = useMemo(() => {
    const q = input.trim().toLowerCase();
    if (!q) return null;
    return (
      allTags.find((t) => t.label.toLowerCase() === q) ?? null
    );
  }, [allTags, input]);

  // Close dropdown on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function addTagId(id: string) {
    if (selectedSet.has(id)) return;
    if (selected.length >= maxTags) {
      toast.error(`Maximum ${maxTags} tags`);
      return;
    }
    onChange([...selected, id]);
    setInput("");
    inputRef.current?.focus();
  }

  function removeTagId(id: string) {
    onChange(selected.filter((x) => x !== id));
  }

  async function createAndAdd() {
    const label = input.trim();
    if (!label) return;
    if (selected.length >= maxTags) {
      toast.error(`Maximum ${maxTags} tags`);
      return;
    }
    if (exactMatch) {
      addTagId(exactMatch.id);
      return;
    }
    try {
      const id = await createTag.mutateAsync(label);
      addTagId(id);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't create tag");
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions[0] && !exactMatch && !input.trim()) return;
      if (exactMatch) addTagId(exactMatch.id);
      else if (suggestions[0]) addTagId(suggestions[0].id);
      else if (input.trim()) createAndAdd();
    } else if (e.key === "Backspace" && !input && selected.length) {
      removeTagId(selected[selected.length - 1]);
    } else if (e.key === "Escape") {
      setFocused(false);
      setInput("");
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex flex-wrap gap-1.5 rounded-md border border-border bg-background p-2 min-h-[44px]">
        {selected.map((id) => {
          const t = tagById.get(id);
          if (!t) return null;
          return (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground text-xs pl-2.5 pr-1 py-1"
            >
              {t.label}
              <button
                type="button"
                onClick={() => removeTagId(id)}
                className="rounded-full hover:bg-primary-foreground/20 p-0.5"
                aria-label={`Remove ${t.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          );
        })}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={onKeyDown}
          placeholder={selected.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] bg-transparent text-sm outline-none px-1"
          maxLength={40}
        />
      </div>

      {focused && (suggestions.length > 0 || input.trim()) && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-popover shadow-sm max-h-64 overflow-y-auto">
          {suggestions.map((t) => (
            <button
              key={t.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addTagId(t.id)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted min-h-[40px]"
            >
              {t.label}
            </button>
          ))}
          {input.trim() && !exactMatch && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={createAndAdd}
              disabled={createTag.isPending}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted min-h-[40px] flex items-center gap-2 border-t border-border text-primary"
            >
              <Plus className="h-3.5 w-3.5" />
              Create "{input.trim()}"
            </button>
          )}
          {!suggestions.length && !input.trim() && (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              No tags yet — type to create one.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
