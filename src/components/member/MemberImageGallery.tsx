import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Plus, Trash2, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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

const MAX_IMAGES = 4;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface MemberImageGalleryProps {
  keyId: number;
  editable?: boolean;
}

export function MemberImageGallery({ keyId, editable = false }: MemberImageGalleryProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; path: string } | null>(null);

  const { data: images = [], isLoading } = useQuery({
    queryKey: ["member-images", keyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("member_images")
        .select("*")
        .eq("key_id", keyId)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // Find next available sort_order
      const usedOrders = new Set(images.map((i) => i.sort_order));
      let nextOrder = -1;
      for (let i = 0; i < MAX_IMAGES; i++) {
        if (!usedOrders.has(i)) { nextOrder = i; break; }
      }
      if (nextOrder === -1) throw new Error("Maximum 4 images allowed");

      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${keyId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("member-images")
        .upload(path, file, { contentType: file.type });
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from("member_images")
        .insert({ key_id: keyId, storage_path: path, sort_order: nextOrder });
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-images", keyId] });
      toast({ title: "Image uploaded" });
    },
    onError: (err: any) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, path }: { id: string; path: string }) => {
      await supabase.storage.from("member-images").remove([path]);
      const { error } = await supabase.from("member_images").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-images", keyId] });
      toast({ title: "Image removed" });
    },
    onError: (err: any) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum size is 5MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    await uploadMutation.mutateAsync(file);
    setUploading(false);
    // Reset input
    if (fileRef.current) fileRef.current.value = "";
  };

  const getPublicUrl = (path: string) =>
    `${SUPABASE_URL}/storage/v1/object/public/member-images/${path}`;

  if (isLoading) return null;
  if (!editable && images.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Camera className="h-4 w-4 text-muted-foreground" />
          Member Photos (visible in members directory)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {images.map((img) => (
            <div key={img.id} className="relative group rounded-lg overflow-hidden border bg-muted aspect-square">
              <img
                src={getPublicUrl(img.storage_path)}
                alt="Aircraft"
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {editable && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1.5 right-1.5 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setDeleteTarget({ id: img.id, path: img.storage_path })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}

          {editable && images.length < MAX_IMAGES && (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1.5 aspect-square text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <span className="text-xs animate-pulse">Uploading...</span>
              ) : (
                <>
                  <Plus className="h-6 w-6" />
                  <span className="text-xs">Add Photo</span>
                </>
              )}
            </button>
          )}
        </div>

        {editable && (
          <p className="text-xs text-muted-foreground mt-2">
            {images.length}/{MAX_IMAGES} photos · Max 5MB each
          </p>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove photo?</AlertDialogTitle>
              <AlertDialogDescription>This will permanently delete this image.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleteTarget) deleteMutation.mutate(deleteTarget);
                  setDeleteTarget(null);
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
