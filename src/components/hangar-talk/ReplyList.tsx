import { useState } from "react";
import { authorDisplayName, timeAgo, type Reply } from "@/lib/hangarTalk/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Trash2, X, Check } from "lucide-react";
import { useDeleteReply, useUpdateReply } from "@/lib/hangarTalk/api";
import { toast } from "sonner";

export function ReplyList({
  replies,
  myKeyId,
  isOfficerOrAbove,
}: {
  replies: Reply[];
  myKeyId: number | null;
  isOfficerOrAbove: boolean;
}) {
  const remove = useDeleteReply();
  const update = useUpdateReply();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  async function onDelete(r: Reply) {
    if (!confirm("Delete this reply?")) return;
    try {
      await remove.mutateAsync({
        id: r.id,
        post_id: r.post_id,
        imagePath: r.image_storage_path,
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete reply");
    }
  }

  function startEdit(r: Reply) {
    setEditingId(r.id);
    setDraft(r.body);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft("");
  }

  async function saveEdit(r: Reply) {
    const body = draft.trim();
    if (!body) {
      toast.error("Reply cannot be empty.");
      return;
    }
    try {
      await update.mutateAsync({ id: r.id, post_id: r.post_id, body });
      toast.success("Reply updated.");
      cancelEdit();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update reply");
    }
  }

  if (!replies.length) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No replies yet. Be the first to respond.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {replies.map((r) => {
        const isMine = myKeyId === r.author_key_id;
        const canEdit = isMine;
        const canDelete = isMine;
        const isEditing = editingId === r.id;
        return (
          <div
            key={r.id}
            className="rounded-md border border-border p-3 space-y-2 bg-background"
          >
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {authorDisplayName(r.author)}
              </span>
              <div className="flex items-center gap-1">
                <span>{timeAgo(r.created_at)}</span>
                {!isEditing && canEdit && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => startEdit(r)}
                    aria-label="Edit reply"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
                {!isEditing && canDelete && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => onDelete(r)}
                    aria-label="Delete reply"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={3}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={cancelEdit}
                    disabled={update.isPending}
                  >
                    <X className="h-4 w-4" /> Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => saveEdit(r)}
                    disabled={update.isPending}
                  >
                    <Check className="h-4 w-4" />
                    {update.isPending ? "Saving…" : "Save"}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap">{r.body}</p>
            )}
            {!isEditing && r.image_signed_url && (
              <a href={r.image_signed_url} target="_blank" rel="noreferrer">
                <img
                  src={r.image_signed_url}
                  alt=""
                  className="rounded-md border border-border max-h-64 object-cover"
                />
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}
