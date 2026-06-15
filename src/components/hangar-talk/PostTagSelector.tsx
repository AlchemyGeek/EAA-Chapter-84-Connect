import { useMemo } from "react";
import { useTagCategories, useTags } from "@/lib/hangarTalk/api";

export function PostTagSelector({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const { data: categories = [] } = useTagCategories();
  const { data: tags = [] } = useTags();

  const grouped = useMemo(() => {
    return categories.map((cat) => ({
      cat,
      tags: tags
        .filter((t) => t.category_id === cat.id && !t.archived)
        .sort((a, b) => a.position - b.position),
    }));
  }, [categories, tags]);

  function toggle(id: string) {
    const set = new Set(selected);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    onChange(Array.from(set));
  }

  if (!grouped.length) {
    return (
      <p className="text-xs text-muted-foreground">
        No tags configured yet.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-md border border-border p-3 bg-background">
      {grouped.map(({ cat, tags: catTags }) =>
        catTags.length ? (
          <div key={cat.id} className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">{cat.label}</p>
            <div className="flex flex-wrap gap-1.5">
              {catTags.map((t) => {
                const on = selected.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggle(t.id)}
                    className={`px-2.5 py-1.5 rounded-full text-xs border min-h-[32px] transition-colors ${
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-muted"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null,
      )}
    </div>
  );
}
