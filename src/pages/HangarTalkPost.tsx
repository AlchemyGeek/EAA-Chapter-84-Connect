import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Pencil, Trash2, CheckCircle2, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  useCurrentMember,
  useDeletePost,
  usePost,
  useToggleResolved,
} from "@/lib/hangarTalk/api";
import { useWithViewAs } from "@/lib/hangarTalk/viewAs";
import { useAuth } from "@/hooks/useAuth";
import { TypeBadge } from "@/components/hangar-talk/TypeBadge";
import { PostTagChips } from "@/components/hangar-talk/PostTagChips";
import { ReplyList } from "@/components/hangar-talk/ReplyList";
import { ReplyComposer } from "@/components/hangar-talk/ReplyComposer";
import { SubscribeToggle } from "@/components/hangar-talk/SubscribeToggle";
import { authorDisplayName, timeAgo } from "@/lib/hangarTalk/types";

export default function HangarTalkPost() {
  const { id } = useParams();
  const navigate = useNavigate();
  const withViewAs = useWithViewAs();
  const { isOfficerOrAbove } = useAuth();
  const { data: me } = useCurrentMember();
  const { data, isLoading } = usePost(id);
  const remove = useDeletePost();
  const toggle = useToggleResolved();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isLoading) return <p className="p-6 text-muted-foreground">Loading…</p>;
  if (!data) return <p className="p-6">Post not found.</p>;

  const { post, replies } = data;
  const myKeyId = me?.key_id ?? null;
  const isMine = !!myKeyId && myKeyId === post.author_key_id;
  const isActive = me?.current_standing === "Active";
  const canEdit = isMine;
  const canDelete = isMine;
  const canToggle = isMine;

  async function onDelete() {
    try {
      await remove.mutateAsync({
        id: post.id,
        imagePaths: post.images.map((i) => i.storage_path),
      });
      toast.success("Post deleted.");
      navigate(withViewAs("/hangar-talk"));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setConfirmDelete(false);
    }
  }

  async function onToggle() {
    try {
      await toggle.mutateAsync({ id: post.id, resolved: !post.resolved_at });
      toast.success(post.resolved_at ? "Reopened." : "Marked as resolved.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 space-y-4">
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="min-h-[44px] min-w-[44px]">
          <Link to={withViewAs("/hangar-talk")}><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <h1 className="text-lg font-semibold flex-1 truncate">Hangar Talk</h1>
      </header>

      <article className="rounded-lg border border-border bg-background p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <TypeBadge type={post.type} />
          {post.resolved_at && (
            <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400 font-medium">
              <CheckCircle2 className="h-3 w-3" />
              Resolved
            </span>
          )}
        </div>
        <h2 className="text-xl font-semibold leading-snug">{post.title}</h2>
        <p className="text-sm text-muted-foreground">
          {authorDisplayName(post.author)} · {timeAgo(post.created_at)}
        </p>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{post.body}</p>
        {post.tag_ids.length > 0 && <PostTagChips tagIds={post.tag_ids} />}
        {post.images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
            {post.images.map(
              (img) =>
                img.signed_url && (
                  <a
                    key={img.id}
                    href={img.signed_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block"
                  >
                    <img
                      src={img.signed_url}
                      alt=""
                      className="w-full h-32 object-cover rounded-md border border-border"
                    />
                  </a>
                ),
            )}
          </div>
        )}

        {(canEdit || canDelete || canToggle) && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
            {canToggle && (
              <Button size="sm" variant="outline" onClick={onToggle}>
                {post.resolved_at ? (
                  <>
                    <RotateCcw className="h-4 w-4" /> Reopen
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Mark Resolved
                  </>
                )}
              </Button>
            )}
            {canEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(withViewAs(`/hangar-talk/${post.id}/edit`))}
              >
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            )}
            {canDelete && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            )}
          </div>
        )}
      </article>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">
          Replies <span className="text-muted-foreground">({replies.length})</span>
        </h3>
        <ReplyList
          replies={replies}
          myKeyId={myKeyId}
          isOfficerOrAbove={isOfficerOrAbove}
        />
        {isActive && myKeyId ? (
          <ReplyComposer postId={post.id} authorKeyId={myKeyId} />
        ) : (
          <p className="text-sm text-muted-foreground border-t border-border pt-4">
            Active chapter membership required to reply.
          </p>
        )}
      </section>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              The post and all replies will be permanently deleted. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
