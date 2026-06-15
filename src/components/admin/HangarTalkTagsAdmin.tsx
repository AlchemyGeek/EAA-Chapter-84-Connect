import { useMemo, useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronRight, Hash, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  useDeleteTag,
  useTagCategories,
  useTags,
  useUpsertTag,
  type TagRow,
} from "@/lib/hangarTalk/api";

export function HangarTalkTagsAdmin() {
  const [open, setOpen] = useState(false);
  const { data: categories = [] } = useTagCategories();
  const { data: tags = [] } = useTags();
  const upsert = useUpsertTag();
  const remove = useDeleteTag();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TagRow | null>(null);
  const [categoryId, setCategoryId] = useState<string>("");
  const [label, setLabel] = useState("");
  const [position, setPosition] = useState("0");

  const grouped = useMemo(() => {
    const byCat = new Map<string, TagRow[]>();
    for (const t of tags) {
      const arr = byCat.get(t.category_id) ?? [];
      arr.push(t);
      byCat.set(t.category_id, arr);
    }
    return byCat;
  }, [tags]);

  function openAdd(catId: string) {
    setEditing(null);
    setCategoryId(catId);
    setLabel("");
    const next = (grouped.get(catId)?.length ?? 0) + 1;
    setPosition(String(next));
    setDialogOpen(true);
  }
  function openEdit(t: TagRow) {
    setEditing(t);
    setCategoryId(t.category_id);
    setLabel(t.label);
    setPosition(String(t.position));
    setDialogOpen(true);
  }
  async function save() {
    try {
      await upsert.mutateAsync({
        id: editing?.id,
        category_id: categoryId,
        label: label.trim(),
        position: Number(position) || 0,
        archived: editing?.archived ?? false,
      });
      toast.success("Tag saved.");
      setDialogOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save tag");
    }
  }
  async function onDelete(t: TagRow) {
    if (!confirm(`Delete tag "${t.label}"? This removes it from any members who selected it.`))
      return;
    try {
      await remove.mutateAsync(t.id);
      toast.success("Tag deleted.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ChevronRight
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    open ? "rotate-90" : ""
                  }`}
                />
                <Hash className="h-4 w-4 text-secondary" />
                Hangar Talk Tags
              </CardTitle>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-5">
            <p className="text-xs text-muted-foreground">
              Predefined tags members select on their profile. Used for matching and
              the Profile Tags section.
            </p>
            {categories.map((cat) => {
              const list = (grouped.get(cat.id) ?? []).sort(
                (a, b) => a.position - b.position,
              );
              return (
                <div key={cat.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {cat.label}
                    </p>
                    <Button size="sm" variant="outline" onClick={() => openAdd(cat.id)} className="h-8">
                      <Plus className="h-3.5 w-3.5" />
                      Add
                    </Button>
                  </div>
                  {list.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No tags yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {list.map((t) => (
                        <div key={t.id} className="inline-flex items-center group">
                          <button
                            type="button"
                            onClick={() => openEdit(t)}
                            className={`pl-3 pr-2 py-1.5 rounded-l-full text-xs border border-r-0 transition-colors min-h-[32px] bg-background border-border hover:bg-muted ${
                              t.archived ? "line-through text-muted-foreground" : ""
                            }`}
                            title="Edit tag"
                          >
                            {t.label}
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(t)}
                            className="px-2 py-1.5 rounded-r-full text-xs border border-border bg-background text-muted-foreground hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors min-h-[32px]"
                            title="Delete tag"
                            aria-label={`Delete ${t.label}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </CollapsibleContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Tag" : "Add Tag"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tag-label">Label</Label>
              <Input
                id="tag-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={80}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tag-pos">Position</Label>
              <Input
                id="tag-pos"
                type="number"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={upsert.isPending}>
                {upsert.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Collapsible>
  );
}
