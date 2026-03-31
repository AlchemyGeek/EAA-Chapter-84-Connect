import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Paperclip,
  Send,
  Trash2,
  FileText,
  X,
  ImageIcon,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

const EMOJIS = ["👍", "👏", "✅", "❤️"];
const PAGE_SIZE = 50;
const MAX_CHARS = 2000;
const MAX_FILES = 3;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];

type Message = {
  id: string;
  key_id: number;
  author_name: string;
  content: string;
  created_at: string;
};

type Attachment = {
  id: string;
  message_id: string;
  storage_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
};

type Reaction = {
  id: string;
  message_id: string;
  key_id: number;
  emoji: string;
};

type PendingFile = {
  file: File;
  preview?: string;
};

export default function HangarTalk() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [sending, setSending] = useState(false);
  const [mentionSearch, setMentionSearch] = useState<string | null>(null);
  const [mentionAnchor, setMentionAnchor] = useState(0);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isAtBottomRef = useRef(true);
  const [oldestLoaded, setOldestLoaded] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Get current member
  const { data: myMember, isLoading: memberLoading } = useQuery({
    queryKey: ["my-member-chat", user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roster_members")
        .select("key_id, first_name, last_name, current_standing, email")
        .ilike("email", user!.email!)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const isActive = myMember?.current_standing === "Active";

  // Fetch messages
  const { data: messages = [], isLoading: msgsLoading } = useQuery({
    queryKey: ["hangar-talk-messages"],
    enabled: isActive,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hangar_talk_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);
      if (error) throw error;
      const sorted = (data ?? []).reverse();
      if (sorted.length > 0) {
        setOldestLoaded(sorted[0].created_at);
        setHasMore(sorted.length === PAGE_SIZE);
      }
      return sorted;
    },
  });

  // Fetch attachments for loaded messages
  const messageIds = messages.map((m) => m.id);
  const { data: attachments = [] } = useQuery({
    queryKey: ["hangar-talk-attachments", messageIds],
    enabled: messageIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hangar_talk_attachments")
        .select("*")
        .in("message_id", messageIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch reactions
  const { data: reactions = [] } = useQuery({
    queryKey: ["hangar-talk-reactions", messageIds],
    enabled: messageIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hangar_talk_reactions")
        .select("*")
        .in("message_id", messageIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Members for @mentions
  const { data: directoryMembers = [] } = useQuery({
    queryKey: ["directory-members-chat"],
    enabled: isActive,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_directory_members");
      if (error) throw error;
      return (data ?? []).map((m: any) => ({
        key_id: m.key_id,
        name: `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim(),
      }));
    },
  });

  // Realtime subscriptions
  useEffect(() => {
    if (!isActive) return;
    const channel = supabase
      .channel("hangar-talk-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hangar_talk_messages" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["hangar-talk-messages"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hangar_talk_reactions" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["hangar-talk-reactions"] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isActive, queryClient]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (isAtBottomRef.current && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages]);

  const handleScroll = useCallback(() => {
    if (!feedRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = feedRef.current;
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 50;
  }, []);

  // Load older messages
  const loadOlder = async () => {
    if (!oldestLoaded || !hasMore) return;
    const { data, error } = await supabase
      .from("hangar_talk_messages")
      .select("*")
      .lt("created_at", oldestLoaded)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);
    if (error) {
      toast({ title: "Error loading older messages", variant: "destructive" });
      return;
    }
    if (data && data.length > 0) {
      const older = data.reverse();
      setOldestLoaded(older[0].created_at);
      setHasMore(data.length === PAGE_SIZE);
      queryClient.setQueryData(
        ["hangar-talk-messages"],
        (prev: Message[] | undefined) => [...older, ...(prev ?? [])]
      );
    } else {
      setHasMore(false);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!myMember || (!content.trim() && pendingFiles.length === 0)) return;
    if (content.length > MAX_CHARS) return;
    setSending(true);
    try {
      const { data: msg, error: msgErr } = await supabase
        .from("hangar_talk_messages")
        .insert({
          key_id: myMember.key_id,
          author_name: `${myMember.first_name ?? ""} ${myMember.last_name ?? ""}`.trim(),
          content: content.trim(),
        })
        .select()
        .single();
      if (msgErr) throw msgErr;

      // Upload attachments
      for (const pf of pendingFiles) {
        const ext = pf.file.name.split(".").pop() ?? "bin";
        const path = `${msg.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("hangar-talk")
          .upload(path, pf.file);
        if (upErr) {
          console.error("Upload error:", upErr);
          continue;
        }
        await supabase.from("hangar_talk_attachments").insert({
          message_id: msg.id,
          storage_path: path,
          file_name: pf.file.name,
          file_type: pf.file.type.startsWith("image/") ? "image" : "pdf",
          file_size: pf.file.size,
        });
      }

      setContent("");
      setPendingFiles([]);
      isAtBottomRef.current = true;
      // Force refetch to show new message immediately
      await queryClient.invalidateQueries({ queryKey: ["hangar-talk-messages"] });
    } catch (e: any) {
      toast({ title: "Failed to send message", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  // Delete message (admin)
  const deleteMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from("hangar_talk_messages")
        .delete()
        .eq("id", messageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hangar-talk-messages"] });
    },
  });

  // Toggle reaction
  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!myMember) return;
    const existing = reactions.find(
      (r) => r.message_id === messageId && r.key_id === myMember.key_id && r.emoji === emoji
    );
    if (existing) {
      await supabase.from("hangar_talk_reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("hangar_talk_reactions").insert({
        message_id: messageId,
        key_id: myMember.key_id,
        emoji,
      });
    }
    queryClient.invalidateQueries({ queryKey: ["hangar-talk-reactions"] });
  };

  // File picker
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const remaining = MAX_FILES - pendingFiles.length;
    const toAdd = files.slice(0, remaining);
    const invalid = toAdd.filter(
      (f) => !ALLOWED_TYPES.includes(f.type) || f.size > MAX_FILE_SIZE
    );
    if (invalid.length > 0) {
      toast({
        title: "Some files were skipped",
        description: "Only JPG, PNG, and PDF under 10MB are allowed.",
        variant: "destructive",
      });
    }
    const valid = toAdd.filter(
      (f) => ALLOWED_TYPES.includes(f.type) && f.size <= MAX_FILE_SIZE
    );
    setPendingFiles((prev) => [
      ...prev,
      ...valid.map((f) => ({
        file: f,
        preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined,
      })),
    ]);
    e.target.value = "";
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => {
      const copy = [...prev];
      if (copy[index].preview) URL.revokeObjectURL(copy[index].preview!);
      copy.splice(index, 1);
      return copy;
    });
  };

  // @mention handling
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length > MAX_CHARS) return;
    setContent(val);

    const cursor = e.target.selectionStart;
    const before = val.slice(0, cursor);
    const match = before.match(/@(\w*)$/);
    if (match) {
      setMentionSearch(match[1].toLowerCase());
      setMentionAnchor(cursor - match[0].length);
    } else {
      setMentionSearch(null);
    }
  };

  const insertMention = (name: string) => {
    const before = content.slice(0, mentionAnchor);
    const after = content.slice(
      mentionAnchor + (mentionSearch?.length ?? 0) + 1
    );
    setContent(`${before}@${name} ${after}`);
    setMentionSearch(null);
    inputRef.current?.focus();
  };

  const filteredMentions =
    mentionSearch !== null
      ? directoryMembers
          .filter((m) => m.name.toLowerCase().includes(mentionSearch))
          .slice(0, 8)
      : [];

  // Render message content with @mention highlighting
  const renderContent = (text: string) => {
    const parts = text.split(/(@\w+(?:\s\w+)?)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        return (
          <span key={i} className="bg-primary/10 text-primary font-medium rounded px-0.5">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from("hangar-talk").getPublicUrl(path);
    return data.publicUrl;
  };

  if (authLoading || memberLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (myMember && !isActive) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
        <p className="text-muted-foreground mb-4">
          Hangar Talk is available to active members only.
        </p>
        <Link to="/home">
          <Button variant="outline">Back to Home</Button>
        </Link>
      </div>
    );
  }

  const attachmentsByMsg = attachments.reduce<Record<string, Attachment[]>>(
    (acc, a) => {
      (acc[a.message_id] ??= []).push(a);
      return acc;
    },
    {}
  );

  const reactionsByMsg = reactions.reduce<
    Record<string, Record<string, { count: number; myReaction: boolean }>>
  >((acc, r) => {
    if (!acc[r.message_id]) acc[r.message_id] = {};
    if (!acc[r.message_id][r.emoji])
      acc[r.message_id][r.emoji] = { count: 0, myReaction: false };
    acc[r.message_id][r.emoji].count++;
    if (myMember && r.key_id === myMember.key_id)
      acc[r.message_id][r.emoji].myReaction = true;
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3 shrink-0">
        <Link to="/home" className="p-1 -ml-1 rounded-md hover:bg-primary-foreground/10 min-h-[44px] min-w-[44px] flex items-center justify-center">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold">Hangar Talk</h1>
      </div>

      {/* Message feed */}
      <div
        ref={feedRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
      >
        {hasMore && messages.length > 0 && (
          <div className="text-center">
            <Button variant="ghost" size="sm" onClick={loadOlder} className="text-xs text-muted-foreground">
              Load older messages
            </Button>
          </div>
        )}

        {msgsLoading ? (
          <div className="text-center text-muted-foreground animate-pulse py-8">
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No messages yet. Be the first to say something!
          </div>
        ) : (
          messages.map((msg) => {
            const msgAttachments = attachmentsByMsg[msg.id] ?? [];
            const msgReactions = reactionsByMsg[msg.id] ?? {};
            const isOwnMessage = myMember && msg.key_id === myMember.key_id;

            return (
              <div key={msg.id} className="group">
                <div className="flex items-start gap-2">
                  {/* Avatar circle */}
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">
                    {msg.author_name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {msg.author_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(msg.created_at).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                      {isAdmin && (
                        <button
                          onClick={() => deleteMutation.mutate(msg.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive/60 hover:text-destructive ml-auto p-1"
                          title="Delete message"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {msg.content && (
                      <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap break-words">
                        {renderContent(msg.content)}
                      </p>
                    )}
                    {/* Attachments */}
                    {msgAttachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {msgAttachments.map((att) => {
                          const url = getPublicUrl(att.storage_path);
                          if (att.file_type === "image") {
                            return (
                              <button
                                key={att.id}
                                onClick={() => setExpandedImage(url)}
                                className="rounded-md overflow-hidden border max-w-[200px]"
                              >
                                <img
                                  src={url}
                                  alt={att.file_name}
                                  className="max-h-40 object-cover"
                                  loading="lazy"
                                />
                              </button>
                            );
                          }
                          return (
                            <a
                              key={att.id}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted transition-colors"
                            >
                              <FileText className="h-4 w-4 text-destructive" />
                              <span className="truncate max-w-[150px]">
                                {att.file_name}
                              </span>
                            </a>
                          );
                        })}
                      </div>
                    )}
                    {/* Reactions */}
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      {EMOJIS.map((emoji) => {
                        const data = msgReactions[emoji];
                        if (!data) return null;
                        return (
                          <button
                            key={emoji}
                            onClick={() => toggleReaction(msg.id, emoji)}
                            className={`text-xs rounded-full px-2 py-0.5 border transition-colors ${
                              data.myReaction
                                ? "bg-primary/10 border-primary/30 text-primary"
                                : "bg-muted border-transparent text-muted-foreground hover:border-border"
                            }`}
                          >
                            {emoji} {data.count}
                          </button>
                        );
                      })}
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="text-xs rounded-full px-2 py-0.5 border border-transparent text-muted-foreground hover:bg-muted hover:border-border transition-colors opacity-0 group-hover:opacity-100">
                            +
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-2" side="top">
                          <div className="flex gap-1">
                            {EMOJIS.map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => toggleReaction(msg.id, emoji)}
                                className="text-lg hover:scale-125 transition-transform p-1"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* @mention dropdown */}
      {mentionSearch !== null && filteredMentions.length > 0 && (
        <div className="border-t bg-card px-4 py-2 max-h-40 overflow-y-auto">
          {filteredMentions.map((m) => (
            <button
              key={m.key_id}
              onClick={() => insertMention(m.name)}
              className="block w-full text-left px-3 py-2 text-sm rounded hover:bg-muted transition-colors"
            >
              {m.name}
            </button>
          ))}
        </div>
      )}

      {/* Pending files preview */}
      {pendingFiles.length > 0 && (
        <div className="border-t px-4 py-2 flex gap-2 overflow-x-auto bg-card">
          {pendingFiles.map((pf, i) => (
            <div key={i} className="relative shrink-0">
              {pf.preview ? (
                <img
                  src={pf.preview}
                  alt={pf.file.name}
                  className="h-16 w-16 rounded-md object-cover border"
                />
              ) : (
                <div className="h-16 w-16 rounded-md border flex items-center justify-center bg-muted">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <button
                onClick={() => removePendingFile(i)}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="border-t bg-card px-4 py-3 shrink-0">
        <div className="flex items-end gap-2 max-w-2xl mx-auto">
          <label className="cursor-pointer p-2 rounded-md hover:bg-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
            <Paperclip className="h-5 w-5 text-muted-foreground" />
            <input
              type="file"
              className="hidden"
              accept=".jpg,.jpeg,.png,.pdf"
              multiple
              onChange={handleFileSelect}
            />
          </label>
          <div className="flex-1 relative">
            <Textarea
              ref={inputRef}
              value={content}
              onChange={handleContentChange}
              placeholder="Type a message..."
              className="resize-none min-h-[44px] max-h-32 text-sm pr-12"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            {content.length > MAX_CHARS * 0.9 && (
              <span
                className={`absolute bottom-1 right-2 text-xs ${
                  content.length > MAX_CHARS
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {content.length}/{MAX_CHARS}
              </span>
            )}
          </div>
          <Button
            onClick={sendMessage}
            disabled={
              sending ||
              (!content.trim() && pendingFiles.length === 0) ||
              content.length > MAX_CHARS
            }
            size="icon"
            className="min-h-[44px] min-w-[44px]"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Image expand dialog */}
      <Dialog open={!!expandedImage} onOpenChange={() => setExpandedImage(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-2">
          {expandedImage && (
            <img
              src={expandedImage}
              alt="Expanded"
              className="w-full h-full object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
