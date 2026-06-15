import { authorDisplayName, timeAgo, type Reply } from "@/lib/hangarTalk/types";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useDeleteReply } from "@/lib/hangarTalk/api";
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
        const canDelete = isMine;
        return (
          <div
            key={r.id}
            className="rounded-md border border-border p-3 space-y-2 bg-background"
          >
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {authorDisplayName(r.author)}
              </span>
              <div className="flex items-center gap-2">
                <span>{timeAgo(r.created_at)}</span>
                {canDelete && (
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
            <p className="text-sm whitespace-pre-wrap">{r.body}</p>
            {r.image_signed_url && (
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
