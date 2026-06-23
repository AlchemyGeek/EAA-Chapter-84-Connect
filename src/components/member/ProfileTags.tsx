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
  useTags,
  useCreateTag,
} from "@/lib/hangarTalk/api";
import { TagAutocomplete } from "@/components/hangar-talk/TagAutocomplete";
import { toast } from "sonner";

export function ProfileTags({
  keyId,
  editable,
}: {
  keyId: number;
  editable: boolean;
}) {
  const { data: allTags = [] } = useTags();
  const { data: selected = new Set<string>() } = useMemberTags(keyId);
  const setTag = useSetMemberTag();
  const [open, setOpen] = useState(false);

  const selectedIds = useMemo(() => Array.from(selected), [selected]);
  const tagById = useMemo(() => {
    const m = new Map<string, (typeof allTags)[number]>();
    for (const t of allTags) m.set(t.id, t);
    return m;
  }, [allTags]);

  async function handleChange(next: string[]) {
    const nextSet = new Set(next);
    const adds = next.filter((id) => !selected.has(id));
    const removes = selectedIds.filter((id) => !nextSet.has(id));
    try {
      await Promise.all([
        ...adds.map((id) =>
          setTag.mutateAsync({ key_id: keyId, tag_id: id, on: true }),
        ),
        ...removes.map((id) =>
          setTag.mutateAsync({ key_id: keyId, tag_id: id, on: false }),
        ),
      ]);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't update tags");
    }
  }

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
                      : "Add tags to help match you with other members"}
                  </p>
                </div>
              </div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                Type to search existing tags or create your own (e.g. taildragger,
                IFR, EAA mentor).
              </p>
              <TagAutocomplete
                selected={selectedIds}
                onChange={handleChange}
                placeholder="Add a tag…"
                maxTags={15}
              />
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  }

  // Read-only view
  const tags = selectedIds
    .map((id) => tagById.get(id))
    .filter((t): t is NonNullable<typeof t> => !!t)
    .sort((a, b) => a.label.localeCompare(b.label));

  if (!tags.length) return null;

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-semibold text-sm">Profile Tags</h3>
      </div>
      <div className="p-4">
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <Badge key={t.id} variant="secondary">
              {t.label}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
