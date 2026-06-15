import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
  useCurrentMember,
  usePost,
  useUpdatePost,
} from "@/lib/hangarTalk/api";
import { useWithViewAs } from "@/lib/hangarTalk/viewAs";
import { POST_TYPE_LABEL, type PostType } from "@/lib/hangarTalk/types";

const TYPES: PostType[] = ["question", "help_wanted", "fyi"];

export default function HangarTalkEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const withViewAs = useWithViewAs();
  const { data: me } = useCurrentMember();
  const { data, isLoading } = usePost(id);
  const update = useUpdatePost();

  const [type, setType] = useState<PostType>("question");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (data?.post) {
      setType(data.post.type);
      setTitle(data.post.title);
      setBody(data.post.body);
    }
  }, [data]);

  if (isLoading) return <p className="p-6 text-muted-foreground">Loading…</p>;
  if (!data) return <p className="p-6">Post not found.</p>;
  if (!me || me.key_id !== data.post.author_key_id) {
    return <Navigate to={withViewAs(`/hangar-talk/${id}`)} replace />;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error("Title and body are required.");
      return;
    }
    try {
      await update.mutateAsync({
        id: data!.post.id,
        type,
        title: title.trim(),
        body: body.trim(),
      });
      toast.success("Post updated.");
      navigate(withViewAs(`/hangar-talk/${data!.post.id}`));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 space-y-4">
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="min-h-[44px] min-w-[44px]">
          <Link to={withViewAs(`/hangar-talk/${id}`)}><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <h1 className="text-xl font-semibold">Edit Post</h1>
      </header>

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label>Type</Label>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`px-3 py-2 rounded-md border text-sm min-h-[44px] ${
                  type === t
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-muted"
                }`}
              >
                {POST_TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={140}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="body">Body</Label>
          <Textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            required
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Image edits are not supported in this release — delete and repost to change images.
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" asChild>
            <Link to={withViewAs(`/hangar-talk/${id}`)}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={update.isPending} className="min-h-[44px]">
            {update.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </div>
  );
}
