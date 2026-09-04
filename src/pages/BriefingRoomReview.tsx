import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Check, ExternalLink, Pencil, X, Archive as ArchiveIcon, Undo2, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentMember } from "@/lib/hangarTalk/api";
import { useIsOfficer } from "@/hooks/useIsOfficer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { BriefingMasthead } from "@/components/briefing-room/BriefingMasthead";
import { CategoryChip } from "@/components/briefing-room/BriefingItemCard";
import {
  usePendingItems,
  useRecentPublishedForReview,
  useUpdateItem,
  useDeleteItem,
  type ItemEdit,
} from "@/lib/briefingRoom/api";
import {
  BRIEFING_CATEGORIES,
  CATEGORY_LABEL,
  displayDate,
  type BriefingCategory,
  type BriefingItem,
} from "@/lib/briefingRoom/types";

export default function BriefingRoomReview() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const { data: me } = useCurrentMember();
  const { isOfficer, isLoading: officerLoading } = useIsOfficer(me?.key_id);
  const allowed = isOfficer || isAdmin;

  const { data: pending = [], isLoading } = usePendingItems();
  const { data: recent = [] } = useRecentPublishedForReview();

  const editorName = me ? `${me.first_name ?? ""} ${me.last_name ?? ""}`.trim() : null;
  const update = useUpdateItem(editorName);
  const deleteItem = useDeleteItem();

  if (!authLoading && !user) return <Navigate to="/auth" replace />;
  if (!authLoading && !officerLoading && me && !allowed) return <Navigate to="/briefing-room" replace />;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <BriefingMasthead active="review" showReview />

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Pending review {pending.length > 0 && `(${pending.length})`}
          </h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : pending.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              Nothing waiting for review.
            </div>
          ) : (
            pending.map((item) => (
              <ReviewRow key={item.id} item={item} update={update} deleteItem={deleteItem} pending />
            ))
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Recently published
          </h2>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing published yet.</p>
          ) : (
            recent.map((item) => <ReviewRow key={item.id} item={item} update={update} deleteItem={deleteItem} />)
          )}
        </section>
      </div>
    </div>
  );
}

function ReviewRow({
  item,
  update,
  deleteItem,
  pending = false,
}: {
  item: BriefingItem;
  update: ReturnType<typeof useUpdateItem>;
  deleteItem: ReturnType<typeof useDeleteItem>;
  pending?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ItemEdit>({
    headline: item.headline,
    summary: item.summary,
    category: item.category,
    source_name: item.source_name,
    image_url: item.image_url ?? "",
  });

  async function run(
    args: Parameters<typeof update.mutateAsync>[0],
    message: string,
  ) {
    try {
      await update.mutateAsync(args);
      toast({ title: message });
    } catch (e: any) {
      toast({ title: "Could not save", description: e?.message, variant: "destructive" });
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this story permanently?")) return;
    try {
      await deleteItem.mutateAsync({ id: item.id });
      toast({ title: "Deleted" });
    } catch (e: any) {
      toast({ title: "Could not delete", description: e?.message, variant: "destructive" });
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      {editing ? (
        <div className="space-y-3">
          <Input
            value={draft.headline ?? ""}
            onChange={(e) => setDraft({ ...draft, headline: e.target.value })}
            placeholder="Headline"
          />
          <Textarea
            value={draft.summary ?? ""}
            onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
            rows={4}
            placeholder="Summary"
          />
          <Input
            value={draft.image_url ?? ""}
            onChange={(e) => setDraft({ ...draft, image_url: e.target.value })}
            placeholder="Image URL (https://…) — leave blank for no image"
          />
          <div className="flex flex-wrap gap-2">
            <Input
              value={draft.source_name ?? ""}
              onChange={(e) => setDraft({ ...draft, source_name: e.target.value })}
              placeholder="Source name"
              className="w-auto flex-1"
            />
            <select
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value as BriefingCategory })}
              className="min-h-[44px] rounded-md border border-border bg-background px-2 text-sm"
              aria-label="Category"
            >
              {BRIEFING_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={async () => {
                await run({ id: item.id, changes: draft, markEdited: true }, "Changes saved");
                setEditing(false);
              }}
            >
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <CategoryChip category={item.category} />
            <span className="text-xs text-muted-foreground">{item.source_name}</span>
            <span className="text-xs text-muted-foreground">· {displayDate(item)}</span>
            {item.edited && (
              <Badge variant="outline" className="text-[10px]">
                Edited{item.edited_by_name ? ` by ${item.edited_by_name}` : ""}
              </Badge>
            )}
            {item.status === "archived" && (
              <Badge variant="outline" className="text-[10px]">
                Unpublished
              </Badge>
            )}
            {item.status === "rejected" && (
              <Badge variant="outline" className="text-[10px] text-destructive">
                Rejected
              </Badge>
            )}
          </div>
          <div className="flex items-start gap-3">
            {item.image_url && (
              <img
                src={item.image_url}
                alt={item.headline}
                loading="lazy"
                className="h-16 w-16 shrink-0 rounded-md border border-border object-cover"
              />
            )}
            <h3 className="text-base font-semibold leading-snug">{item.headline}</h3>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.summary}</p>
          <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            {item.source_url}
            <ExternalLink className="h-3 w-3" />
          </a>

          <div className="mt-3 flex flex-wrap gap-2">
            {pending && (
              <Button
                size="sm"
                onClick={() => run({ id: item.id, status: "published" }, "Published")}
              >
                <Check className="mr-1.5 h-4 w-4" />
                Approve
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="mr-1.5 h-4 w-4" />
              Edit
            </Button>
            {pending ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => run({ id: item.id, status: "rejected" }, "Rejected")}
              >
                <X className="mr-1.5 h-4 w-4" />
                Reject
              </Button>
            ) : item.status === "published" ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => run({ id: item.id, status: "archived" }, "Unpublished")}
              >
                <ArchiveIcon className="mr-1.5 h-4 w-4" />
                Unpublish
              </Button>
            ) : item.status === "rejected" ? (
              <Button
                size="sm"
                onClick={() => run({ id: item.id, status: "published" }, "Published")}
              >
                <Check className="mr-1.5 h-4 w-4" />
                Approve
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => run({ id: item.id, status: "published" }, "Republished")}
              >
                <Undo2 className="mr-1.5 h-4 w-4" />
                Republish
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Delete
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
