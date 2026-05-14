import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pencil, Mail, ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface BuddyEmailTemplate {
  id: string;
  template_key: string;
  subject: string;
  body: string;
  updated_at: string;
}

const TEMPLATE_LABELS: Record<string, string> = {
  intro: "Introduction Email",
  reminder: "3-Day Reminder Email",
};

export function BuddyEmailTemplates() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<BuddyEmailTemplate | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["buddy-email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("buddy_email_templates" as any)
        .select("*")
        .order("template_key");
      if (error) throw error;
      return (data as any[]) as BuddyEmailTemplate[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editingTemplate) return;
      const { error } = await supabase
        .from("buddy_email_templates" as any)
        .update({ subject: subject.trim(), body: body.trim(), updated_at: new Date().toISOString() } as any)
        .eq("id", editingTemplate.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buddy-email-templates"] });
      closeDialog();
      toast({ title: "Template updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const openEdit = (tpl: BuddyEmailTemplate) => {
    setEditingTemplate(tpl);
    setSubject(tpl.subject);
    setBody(tpl.body);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingTemplate(null);
    setSubject("");
    setBody("");
  };

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
                <Mail className="h-4 w-4 text-secondary" />
                Buddy Program Emails
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <p className="text-xs text-muted-foreground mb-3">
                Edit the email templates sent to buddy pairs. Placeholders:{" "}
                <code className="text-xs bg-muted px-1 rounded">[NewMemberName]</code>,{" "}
                <code className="text-xs bg-muted px-1 rounded">[BuddyName]</code>,{" "}
                <code className="text-xs bg-muted px-1 rounded">[NewMemberEmail]</code>,{" "}
                <code className="text-xs bg-muted px-1 rounded">[BuddyEmail]</code>.
              </p>
          {isLoading ? (
            <div className="text-sm text-muted-foreground animate-pulse py-4">Loading templates...</div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No templates configured.</p>
          ) : (
            <div className="divide-y divide-border">
              {templates.map((tpl) => (
                <div key={tpl.id} className="flex items-center gap-3 py-2.5 group">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {TEMPLATE_LABELS[tpl.template_key] || tpl.template_key}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      Subject: {tpl.subject}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => openEdit(tpl)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Edit {editingTemplate ? TEMPLATE_LABELS[editingTemplate.template_key] || editingTemplate.template_key : "Template"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="tpl-subject">Subject</Label>
              <Input
                id="tpl-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={200}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpl-body">Body</Label>
              <Textarea
                id="tpl-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                className="font-mono text-xs"
                required
              />
              <p className="text-xs text-muted-foreground">
                Available placeholders: <code>[NewMemberName]</code>, <code>[BuddyName]</code>, <code>[NewMemberEmail]</code>, <code>[BuddyEmail]</code>
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
