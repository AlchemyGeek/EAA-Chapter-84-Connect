import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

function getSecondTuesdayOfJanuaryNextYear(): string {
  const nextYear = new Date().getFullYear() + 1;
  const jan1 = new Date(nextYear, 0, 1);
  // Day of week: 0=Sun, 1=Mon, 2=Tue...
  const dayOfWeek = jan1.getDay();
  // Days until first Tuesday
  const daysUntilTue = (2 - dayOfWeek + 7) % 7;
  const firstTuesday = 1 + daysUntilTue;
  const secondTuesday = firstTuesday + 7;
  // Format as YYYY-MM-DD
  return `${nextYear}-01-${String(secondTuesday).padStart(2, "0")}`;
}

export default function NewMemberApplications() {
  const { user, loading: authLoading, isOfficerOrAbove } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState<"pending" | "completed" | "all">("pending");
  const [detailApp, setDetailApp] = useState<any | null>(null);
  const [promoteApp, setPromoteApp] = useState<any | null>(null);

  // Get last sync date from roster_imports
  const { data: lastSync } = useQuery({
    queryKey: ["last-roster-sync"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roster_imports")
        .select("imported_at")
        .eq("status", "completed")
        .order("imported_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data?.imported_at ? new Date(data.imported_at) : null;
    },
  });

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["new-member-applications", filter],
    queryFn: async () => {
      let query = supabase
        .from("new_member_applications")
        .select("*")
        .order("created_at", { ascending: false });

      if (filter === "pending") query = query.eq("processed", false);
      else if (filter === "completed") query = query.eq("processed", true);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const updateVerification = useMutation({
    mutationFn: async ({
      id,
      field,
      value,
    }: {
      id: string;
      field: "eaa_verified" | "fees_verified";
      value: boolean;
    }) => {
      const { error } = await supabase
        .from("new_member_applications")
        .update({ [field]: value })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["new-member-applications"] });
    },
  });

  const promoteToRegular = useMutation({
    mutationFn: async (app: any) => {
      if (!app.roster_key_id) throw new Error("No linked roster record found");

      const newExpiration = getSecondTuesdayOfJanuaryNextYear();

      // Update roster member
      const { error: rosterError } = await supabase
        .from("roster_members")
        .update({
          member_type: "Regular",
          expiration_date: newExpiration,
        })
        .eq("key_id", app.roster_key_id);
      if (rosterError) throw rosterError;

      // Mark application as processed
      const { error: appError } = await supabase
        .from("new_member_applications")
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
        })
        .eq("id", app.id);
      if (appError) throw appError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["new-member-applications"] });
      toast({ title: "Member promoted to Regular successfully" });
      setPromoteApp(null);
    },
    onError: (err: any) => {
      toast({
        title: "Error promoting member",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleCheckboxChange = (
    app: any,
    field: "eaa_verified" | "fees_verified",
    checked: boolean
  ) => {
    updateVerification.mutate({ id: app.id, field, value: checked });

    // If this check makes both true, prompt promotion
    const otherField = field === "eaa_verified" ? "fees_verified" : "eaa_verified";
    if (checked && app[otherField]) {
      setPromoteApp(app);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isOfficerOrAbove) return <Navigate to="/home" replace />;

  const isSynced = (createdAt: string) => {
    if (!lastSync) return false;
    return new Date(createdAt) < lastSync;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserPlus className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">New Member Applications</h1>
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {lastSync && (
        <p className="text-xs text-muted-foreground">
          Last roster sync: {format(lastSync, "MMM d, yyyy h:mm a")}
        </p>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-center text-muted-foreground">Loading...</div>
          ) : applications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              No {filter !== "all" ? filter : ""} applications found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>EAA #</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead className="text-center">EAA National</TableHead>
                  <TableHead className="text-center">Fees</TableHead>
                  <TableHead>Sync</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => (
                  <TableRow
                    key={app.id}
                    className={`cursor-pointer ${app.processed ? "opacity-60" : ""}`}
                    onClick={() => setDetailApp(app)}
                  >
                    <TableCell className="font-medium">
                      {app.last_name}, {app.first_name}
                    </TableCell>
                    <TableCell>{app.eaa_number}</TableCell>
                    <TableCell>{format(new Date(app.created_at), "MM/dd/yyyy")}</TableCell>
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={app.eaa_verified}
                        disabled={app.processed || updateVerification.isPending}
                        onCheckedChange={(checked) =>
                          handleCheckboxChange(app, "eaa_verified", !!checked)
                        }
                      />
                    </TableCell>
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={app.fees_verified}
                        disabled={app.processed || updateVerification.isPending}
                        onCheckedChange={(checked) =>
                          handleCheckboxChange(app, "fees_verified", !!checked)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {isSynced(app.created_at) ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Synced
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          Not Synced
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {app.processed ? (
                        <Badge className="bg-primary/10 text-primary border-0">Completed</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detailApp} onOpenChange={() => setDetailApp(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription>
              Submitted {detailApp && format(new Date(detailApp.created_at), "MMMM d, yyyy")}
            </DialogDescription>
          </DialogHeader>
          {detailApp && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">First Name</span>
                <p className="font-medium">{detailApp.first_name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Last Name</span>
                <p className="font-medium">{detailApp.last_name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">EAA Number</span>
                <p className="font-medium">{detailApp.eaa_number}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Email</span>
                <p className="font-medium">{detailApp.email}</p>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Address</span>
                <p className="font-medium">
                  {detailApp.address}, {detailApp.city}, {detailApp.state} {detailApp.zip_code}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Quarter Applied</span>
                <p className="font-medium">{detailApp.quarter_applied}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Fee Amount</span>
                <p className="font-medium">${Number(detailApp.fee_amount).toFixed(2)}</p>
              </div>
              {detailApp.processed && detailApp.processed_at && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Processed On</span>
                  <p className="font-medium">
                    {format(new Date(detailApp.processed_at), "MMMM d, yyyy h:mm a")}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Promote Confirmation */}
      <AlertDialog open={!!promoteApp} onOpenChange={() => setPromoteApp(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Promote to Regular Member?</AlertDialogTitle>
            <AlertDialogDescription>
              Both EAA National membership and fees have been verified for{" "}
              <strong>
                {promoteApp?.first_name} {promoteApp?.last_name}
              </strong>
              . This will change their membership type from Prospect to Regular and set their
              expiration date to {getSecondTuesdayOfJanuaryNextYear()}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => promoteApp && promoteToRegular.mutate(promoteApp)}
              disabled={promoteToRegular.isPending}
            >
              {promoteToRegular.isPending ? "Processing..." : "Promote to Regular"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
