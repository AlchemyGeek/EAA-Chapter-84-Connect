import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useCreatePost, useCurrentMember } from "@/lib/hangarTalk/api";
import { useWithViewAs } from "@/lib/hangarTalk/viewAs";
import { POST_TYPE_LABEL, type PostType } from "@/lib/hangarTalk/types";
import { ImageUploader } from "@/components/hangar-talk/ImageUploader";
import { PostTagSelector } from "@/components/hangar-talk/PostTagSelector";

const TYPES: PostType[] = ["question", "help_wanted", "fyi"];

export default function HangarTalkNew() {
  const { data: me, isLoading } = useCurrentMember();
  const create = useCreatePost();
  const navigate = useNavigate();
  const withViewAs = useWithViewAs();

  const [type, setType] = useState<PostType>("question");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);

  if (isLoading) return <p className="p-6 text-muted-foreground">Loading…</p>;
  if (!me) return <Navigate to="/home" replace />;
  if (me.current_standing !== "Active") {
    return (
      <div className="p-6 max-w-xl mx-auto space-y-2">
        <p className="font-medium">Active membership required</p>
        <p className="text-sm text-muted-foreground">
          Only Active members can post to Hangar Talk.
        </p>
        <Button asChild variant="outline">
          <Link to={withViewAs("/hangar-talk")}>Back to Hangar Talk</Link>
        </Button>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error("Title and body are required.");
      return;
    }
    try {
      const id = await create.mutateAsync({
        author_key_id: me.key_id,
        type,
        title: title.trim(),
        body: body.trim(),
        images: files,
        tag_ids: tagIds,
      });
      toast.success("Post created.");
      navigate(withViewAs(`/hangar-talk/${id}`));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create post");
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 space-y-4">
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="min-h-[44px] min-w-[44px]">
          <Link to={withViewAs("/hangar-talk")}><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <h1 className="text-xl font-semibold">New Post</h1>
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
            placeholder="A short summary"
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
            placeholder="Share the details…"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Tags (optional)</Label>
          <PostTagSelector selected={tagIds} onChange={setTagIds} />
        </div>
        <div className="space-y-2">
          <Label>Images (optional)</Label>
          <ImageUploader files={files} onChange={setFiles} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" asChild>
            <Link to={withViewAs("/hangar-talk")}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={create.isPending} className="min-h-[44px]">
            {create.isPending ? "Posting…" : "Post"}
          </Button>
        </div>
      </form>
    </div>
  );
}
