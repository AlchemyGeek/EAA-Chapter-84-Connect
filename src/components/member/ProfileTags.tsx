import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  useMemberTags,
  useSetMemberTag,
  useTagCategories,
  useTags,
} from "@/lib/hangarTalk/api";

export function ProfileTags({
  keyId,
  editable,
}: {
  keyId: number;
  editable: boolean;
}) {
  const { data: categories = [] } = useTagCategories();
  const { data: allTags = [] } = useTags();
  const { data: selected = new Set<string>() } = useMemberTags(keyId);
  const setTag = useSetMemberTag();
  const [open, setOpen] = useState(false);

  const grouped = useMemo(() => {
    const byCat = new Map<string, typeof allTags>();
    for (const t of allTags) {
      if (t.archived) continue;
      const arr = byCat.get(t.category_id) ?? [];
      arr.push(t);
      byCat.set(t.category_id, arr);
    }
    return byCat;
  }, [allTags]);

  if (editable) {
    const selectedCount = selected.size;
    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="rounded-lg border border-border bg-background">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full px-4 py-3 border-b border-border flex items-center justify-between text-left hover:bg-muted/50 transition-colors min-h-[44px]"
              aria-expanded={open}
            >
              <div className="flex items-center gap-2">
                <ChevronRight
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    open ? "rotate-90" : ""
                  }`}
                />
                <div>
                  <h3 className="font-semibold text-sm">Profile Tags</h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedCount > 0
                      ? `${selectedCount} selected — tap to manage`
                      : "Tap to add tags that help match you with other members"}
                  </p>
                </div>
              </div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-4 space-y-4">
              {categories.map((cat) => {
                const tags = grouped.get(cat.id) ?? [];
                if (!tags.length) return null;
                return (
                  <div key={cat.id}>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                      {cat.label}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((t) => {
                        const on = selected.has(t.id);
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() =>
                              setTag.mutate({ key_id: keyId, tag_id: t.id, on: !on })
                            }
                            className={`px-3 py-1.5 rounded-full text-xs border transition-colors min-h-[32px] ${
                              on
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background border-border hover:bg-muted"
                            }`}
                          >
                            {t.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  }

  // Read-only view: only categories with selections
  const sections = categories
    .map((cat) => {
      const tags = (grouped.get(cat.id) ?? []).filter((t) => selected.has(t.id));
      return { cat, tags };
    })
    .filter((s) => s.tags.length > 0);

  if (!sections.length) return null;

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-semibold text-sm">Profile Tags</h3>
      </div>
      <div className="p-4 space-y-3">
        {sections.map(({ cat, tags }) => (
          <div key={cat.id}>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
              {cat.label}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <Badge key={t.id} variant="secondary">
                  {t.label}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
