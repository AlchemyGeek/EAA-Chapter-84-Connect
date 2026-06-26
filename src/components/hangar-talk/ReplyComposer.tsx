import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "./ImageUploader";
import { useCreateReply } from "@/lib/hangarTalk/api";
import { toast } from "sonner";
import { Send } from "lucide-react";

export function ReplyComposer({
  postId,
  authorKeyId,
}: {
  postId: string;
  authorKeyId: number;
}) {
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const create = useCreateReply();

  async function submit() {
    if (!body.trim()) {
      toast.error("Reply cannot be empty.");
      return;
    }
    try {
      await create.mutateAsync({
        post_id: postId,
        author_key_id: authorKeyId,
        body: body.trim(),
        image: files[0] ?? null,
      });
      setBody("");
      setFiles([]);
      toast.success("Reply posted.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to post reply");
    }
  }

  return (
    <div className="space-y-2 border-t border-border pt-4">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a reply…"
        rows={3}
      />
      <div className="flex items-end justify-between gap-3">
        <ImageUploader
          files={files}
          onChange={setFiles}
          multiple={false}
          label="Attach image"
        />
        <Button onClick={submit} disabled={create.isPending} className="min-h-[44px]">
          <Send className="h-4 w-4" />
          {create.isPending ? "Posting…" : "Reply"}
        </Button>
      </div>
    </div>
  );
}
