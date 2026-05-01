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
import { UserPlus, AlertTriangle, Mail, CalendarIcon, CircleDollarSign } from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const PAYMENT_METHODS = [
  { label: "Cash", code: "cash" },
  { label: "Check", code: "check" },
  { label: "PayPal", code: "pp" },
  { label: "Square", code: "sq" },
] as const;

function getSecondTuesdayOfMarchNextYear(): string {
  const nextYear = new Date().getFullYear() + 1;
  const mar1 = new Date(nextYear, 2, 1);
  // Day of week: 0=Sun, 1=Mon, 2=Tue...
  const dayOfWeek = mar1.getDay();
  // Days until first Tuesday
  const daysUntilTue = (2 - dayOfWeek + 7) % 7;
  const firstTuesday = 1 + daysUntilTue;
  const secondTuesday = firstTuesday + 7;
  // Format as YYYY-MM-DD
  return `${nextYear}-03-${String(secondTuesday).padStart(2, "0")}`;
}

export default function NewMemberApplications() {
  const { user, loading: authLoading, isOfficerOrAbove } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState<"pending" | "completed" | "all">("pending");
  const [detailApp, setDetailApp] = useState<any | null>(null);
  const [promoteApp, setPromoteApp] = useState<any | null>(null);
  const [feeDialogApp, setFeeDialogApp] = useState<any | null>(null);
  const [payDate, setPayDate] = useState<Date>(new Date());
  const [payAmount, setPayAmount] = useState<string>("");
  const [payMethod, setPayMethod] = useState<string>("Square");

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

  // Load chapter fees so we can default the payment amount to the
  // pro-rated fee that matches the applicant's quarter.
  const { data: chapterFees = [] } = useQuery({
    queryKey: ["chapter-fees-for-applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chapter_fees")
        .select("name, amount")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Resolve the pro-rated / new-member fee amount for an application's quarter.
  // Mirrors the matching logic in the new-member-reminder edge function:
  // extract Q1/Q2/Q3/Q4 from quarter_applied (e.g. "Q2 2026") and pick the
  // matching pro-rated or new-membership fee — never the Annual fee.
  const getProRatedAmountForApp = (app: any): number => {
    const recorded = Number(app?.fee_amount ?? 0);
    if (recorded > 0) return recorded;

    const match = String(app?.quarter_applied || "")
      .toUpperCase()
      .match(/Q[1-4]/);
    if (!match) return 0;
    const quarter = match[0];

    const fee = chapterFees.find((f: any) => {
      const upper = String(f.name || "").toUpperCase();
      return (
        upper.startsWith(quarter + " ") &&
        /(PRO-?RATED|NEW MEMBERSHIP)/.test(upper)
      );
    });
    return fee ? Number(fee.amount) : 0;
  };

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
    staleTime: 0,
  });

  // Check which applicants' EAA numbers already exist in the roster as non-Prospect members
  const eaaNumbers = applications
    .filter((a) => a.eaa_number && a.eaa_number.trim())
    .map((a) => a.eaa_number.trim());

  const { data: existingMembers = [] } = useQuery({
    queryKey: ["existing-eaa-check", eaaNumbers],
    queryFn: async () => {
      if (eaaNumbers.length === 0) return [];
      const { data, error } = await supabase
        .from("roster_members")
        .select("eaa_number, first_name, last_name, member_type, current_standing")
        .in("eaa_number", eaaNumbers)
        .neq("member_type", "Prospect");
      if (error) throw error;
      return data;
    },
    enabled: eaaNumbers.length > 0,
  });

  const existingEaaSet = new Set(existingMembers.map((m) => m.eaa_number?.trim()));

  // For each application's linked roster member, determine when it was last touched by a roster import.
  // An application counts as "synced" only if its linked roster row has been touched by an import
  // that ran at or after the application was processed (or created, if not yet processed).
  const rosterKeyIds = applications
    .map((a) => a.roster_key_id)
    .filter((k): k is number => typeof k === "number");

  const { data: linkedRosterRows = [] } = useQuery({
    queryKey: ["nma-linked-roster-import", rosterKeyIds],
    enabled: rosterKeyIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roster_members")
        .select("key_id, last_import_id")
        .in("key_id", rosterKeyIds);
      if (error) throw error;
      return data;
    },
  });

  const importIds = Array.from(
    new Set(linkedRosterRows.map((r) => r.last_import_id).filter(Boolean) as string[])
  );

  const { data: importTimes = [] } = useQuery({
    queryKey: ["nma-import-times", importIds],
    enabled: importIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roster_imports")
        .select("id, imported_at")
        .in("id", importIds);
      if (error) throw error;
      return data;
    },
  });

  const importTimeById = new Map(importTimes.map((i) => [i.id, new Date(i.imported_at)]));
  const lastImportByKeyId = new Map(
    linkedRosterRows.map((r) => [r.key_id, r.last_import_id ? importTimeById.get(r.last_import_id) : null])
  );


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
        .update({ [field]: value } as any)
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

      const newExpiration = getSecondTuesdayOfMarchNextYear();

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

  const sendReminder = useMutation({
    mutationFn: async (app: any) => {
      const { data, error } = await supabase.functions.invoke("new-member-reminder", {
        body: { application_id: app.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["new-member-applications"] });
      toast({ title: "Reminder email queued" });
      setDetailApp(null);
    },
    onError: (err: any) => {
      toast({
        title: "Could not send reminder",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const recordFeePayment = useMutation({
    mutationFn: async () => {
      const app = feeDialogApp;
      if (!app) throw new Error("No application selected");
      if (!app.roster_key_id) throw new Error("No linked roster record found");
      const methodObj = PAYMENT_METHODS.find((m) => m.label === payMethod);
      if (!methodObj) throw new Error("Invalid method");
      const amountNum = parseFloat(payAmount);
      if (isNaN(amountNum) || amountNum <= 0) throw new Error("Invalid amount");

      const udf1Value = `${format(payDate, "MM/dd/yyyy")} $${amountNum}/${methodObj.code}`;

      const { error: rosterErr } = await supabase
        .from("roster_members")
        .update({ udf1_text: udf1Value } as any)
        .eq("key_id", app.roster_key_id);
      if (rosterErr) throw rosterErr;

      const { error: appErr } = await supabase
        .from("new_member_applications")
        .update({ fees_verified: true } as any)
        .eq("id", app.id);
      if (appErr) throw appErr;

      return app;
    },
    onSuccess: (app) => {
      queryClient.invalidateQueries({ queryKey: ["new-member-applications"] });
      toast({ title: "Payment recorded" });
      const completedApp = app;
      setFeeDialogApp(null);
      if (completedApp?.eaa_verified) {
        setPromoteApp({ ...completedApp, fees_verified: true });
      }
    },
    onError: (err: any) => {
      toast({ title: "Could not record payment", description: err.message, variant: "destructive" });
    },
  });

  const handleCheckboxChange = (
    app: any,
    field: "eaa_verified" | "fees_verified",
    checked: boolean
  ) => {
    // Special flow for marking fees paid: open payment dialog instead of toggling directly
    if (field === "fees_verified" && checked && !app.fees_verified) {
      setPayDate(new Date());
      setPayAmount(app.fee_amount ? String(Number(app.fee_amount)) : "");
      setPayMethod("Square");
      setFeeDialogApp(app);
      return;
    }

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

  const isSynced = (app: any) => {
    if (!app.roster_key_id) return false;
    const rosterImportTime = lastImportByKeyId.get(app.roster_key_id);
    if (!rosterImportTime) return false;
    const reference = app.processed_at ? new Date(app.processed_at) : new Date(app.created_at);
    return rosterImportTime >= reference;
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-bold">New Member Applications</h1>
      <p className="text-sm text-muted-foreground">
        Track new member applications, validate their EAA national membership, and confirm that membership fees have been paid. Once both checks are complete, the member can be promoted from a Prospect to a Regular Member.
      </p>

      <div className="flex items-center justify-between">
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

      {isLoading ? (
        <div className="p-6 text-center text-muted-foreground">Loading...</div>
      ) : applications.length === 0 ? (
        <div className="p-6 text-center text-muted-foreground">
          No {filter !== "all" ? filter : ""} applications found.
        </div>
      ) : (
        <div className="space-y-2">
          {applications.map((app) => (
            <Card
              key={app.id}
              className={`cursor-pointer transition-colors hover:bg-muted/50 ${app.processed ? "opacity-60" : ""}`}
              onClick={() => setDetailApp(app)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">
                      {app.last_name}, {app.first_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      EAA #{app.eaa_number} · {format(new Date(app.created_at), "MM/dd/yyyy")}
                      {!app.processed && (() => {
                        const days = differenceInCalendarDays(new Date(), new Date(app.created_at));
                        return ` · ${days} day${days === 1 ? "" : "s"} ago`;
                      })()}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {existingEaaSet.has(app.eaa_number?.trim()) && (
                        <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/30 gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Existing Member
                        </Badge>
                      )}
                      {isSynced(app) ? (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          Synced
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                          Not Synced
                        </Badge>
                      )}
                      {app.processed ? (
                        <Badge className="text-xs bg-primary/10 text-primary border-0">Completed</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Pending</Badge>
                      )}
                      {!app.processed && app.reminder_sent_at && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 gap-1">
                          <Mail className="h-3 w-3" />
                          Reminder Sent
                        </Badge>
                      )}
                    </div>
                  </div>
                  {!app.processed && (
                    <div className="flex items-center gap-4 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <label className="flex flex-col items-center gap-1 min-h-[44px] justify-center">
                        <Checkbox
                          checked={app.eaa_verified}
                          disabled={updateVerification.isPending}
                          onCheckedChange={(checked) =>
                            handleCheckboxChange(app, "eaa_verified", !!checked)
                          }
                        />
                        <span className="text-[10px] text-muted-foreground leading-none">EAA</span>
                      </label>
                      <label className="flex flex-col items-center gap-1 min-h-[44px] justify-center">
                        <Checkbox
                          checked={app.fees_verified}
                          disabled={updateVerification.isPending}
                          onCheckedChange={(checked) =>
                            handleCheckboxChange(app, "fees_verified", !!checked)
                          }
                        />
                        <span className="text-[10px] text-muted-foreground leading-none">Fees</span>
                      </label>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
            <div className="space-y-3">
              {existingEaaSet.has(detailApp.eaa_number?.trim()) && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Possible duplicate</p>
                    <p className="text-xs">
                      EAA #{detailApp.eaa_number} already belongs to an existing member in the roster
                      ({existingMembers.find((m) => m.eaa_number?.trim() === detailApp.eaa_number?.trim())?.first_name}{" "}
                      {existingMembers.find((m) => m.eaa_number?.trim() === detailApp.eaa_number?.trim())?.last_name} –{" "}
                      {existingMembers.find((m) => m.eaa_number?.trim() === detailApp.eaa_number?.trim())?.member_type},{" "}
                      {existingMembers.find((m) => m.eaa_number?.trim() === detailApp.eaa_number?.trim())?.current_standing}).
                    </p>
                  </div>
                </div>
              )}
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
              {detailApp.reminder_sent_at && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Dues Reminder Sent</span>
                  <p className="font-medium">
                    {format(new Date(detailApp.reminder_sent_at), "MMMM d, yyyy h:mm a")}
                  </p>
                </div>
              )}
              </div>

              {!detailApp.processed && !detailApp.fees_verified && (
                <div className="pt-2 border-t border-border">
                  {detailApp.reminder_sent_at ? (
                    <p className="text-xs text-muted-foreground">
                      A dues reminder has already been sent. Only one reminder per applicant is allowed.
                    </p>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                      disabled={sendReminder.isPending}
                      onClick={() => sendReminder.mutate(detailApp)}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      {sendReminder.isPending ? "Sending..." : "Send Dues Reminder Email"}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Record Membership Payment Dialog */}
      <Dialog open={!!feeDialogApp} onOpenChange={(open) => !open && setFeeDialogApp(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CircleDollarSign className="h-5 w-5" />
              Record Membership Payment
            </DialogTitle>
            <DialogDescription>
              {feeDialogApp && (
                <>Recording payment for <strong>{feeDialogApp.first_name} {feeDialogApp.last_name}</strong></>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Payment Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !payDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {payDate ? format(payDate, "MMM d, yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={payDate}
                    onSelect={(d) => d && setPayDate(d)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Amount ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="40.00"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.code} value={m.label}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeeDialogApp(null)}>Cancel</Button>
            <Button
              onClick={() => recordFeePayment.mutate()}
              disabled={!payAmount || !payMethod || recordFeePayment.isPending}
            >
              {recordFeePayment.isPending ? "Recording..." : "Confirm Payment"}
            </Button>
          </DialogFooter>
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
              expiration date to {getSecondTuesdayOfMarchNextYear()}. This action cannot be undone.
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
