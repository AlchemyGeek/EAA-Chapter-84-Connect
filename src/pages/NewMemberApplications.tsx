import { useState, useEffect, useRef } from "react";
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
import { UserPlus, AlertTriangle, Mail, CalendarIcon, CircleDollarSign, Archive, RotateCcw } from "lucide-react";
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

type ApplicationRosterMatch = {
  key_id: number;
  member_type: string | null;
  current_standing: string | null;
  expiration_date: string | null;
};

export default function NewMemberApplications() {
  const { user, loading: authLoading, isOfficerOrAbove } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState<"pending" | "incomplete" | "completed" | "all">("pending");
  const [archiveApp, setArchiveApp] = useState<any | null>(null);
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

      if (filter === "pending") query = query.eq("processed", false).is("archived_at", null);
      else if (filter === "incomplete") query = query.not("archived_at", "is", null);
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
        .select("key_id, eaa_number, first_name, last_name, member_type, current_standing")
        .in("eaa_number", eaaNumbers)
        .neq("member_type", "Prospect");
      if (error) throw error;
      return data;
    },
    enabled: eaaNumbers.length > 0,
  });

  // A match is only a real duplicate when it points at a *different* roster row
  // than the one this application created/owns. Once an applicant is promoted,
  // their own roster row stops being a Prospect and would otherwise match itself.
  const duplicateFor = (app: { eaa_number?: string | null; roster_key_id?: number | null }) =>
    existingMembers.find(
      (m) =>
        m.eaa_number?.trim() === app.eaa_number?.trim() &&
        m.key_id !== app.roster_key_id
    );

  const existingEaaSet = new Set(
    applications.filter((a) => duplicateFor(a)).map((a) => a.eaa_number?.trim())
  );


  // Principle: the roster import is the authoritative source of truth for
  // member identity. For each application, look up the current roster row —
  // preferring the stable roster_key_id anchor (written by the prospect
  // creation trigger) and falling back to EAA# for legacy rows without a link.
  const rosterKeyIds = Array.from(
    new Set(
      applications
        .map((a) => a.roster_key_id)
        .filter((v): v is number => typeof v === "number")
    )
  );

  const { data: linkedRosterRows = [] } = useQuery({
    queryKey: ["nma-linked-roster", rosterKeyIds, eaaNumbers],
    enabled: rosterKeyIds.length > 0 || eaaNumbers.length > 0,
    queryFn: async () => {
      // Fetch by key_id and eaa_number in parallel, then merge/dedupe by key_id.
      const [byKey, byEaa] = await Promise.all([
        rosterKeyIds.length > 0
          ? supabase
              .from("roster_members")
              .select("key_id, eaa_number")
              .in("key_id", rosterKeyIds)
          : Promise.resolve({ data: [], error: null }),
        eaaNumbers.length > 0
          ? supabase
              .from("roster_members")
              .select("key_id, eaa_number")
              .in("eaa_number", eaaNumbers)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (byKey.error) throw byKey.error;
      if (byEaa.error) throw byEaa.error;
      const merged = new Map<number, { key_id: number; eaa_number: string | null }>();
      for (const r of [...(byKey.data ?? []), ...(byEaa.data ?? [])]) {
        merged.set(r.key_id, r as any);
      }
      return Array.from(merged.values());
    },
  });

  const rosterByKeyId = new Map(linkedRosterRows.map((r) => [r.key_id, r]));
  const rosterByEaa = new Map(
    linkedRosterRows
      .map((r) => [(r.eaa_number ?? "").trim(), r] as const)
      .filter(([e]) => e)
  );

  // Auto-reconcile: when an application has a stable roster_key_id link but its
  // recorded EAA# differs from the roster's, trust the roster and update the
  // application. Runs once per (app, roster-eaa) pair to avoid re-firing.
  const reconciledRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    (async () => {
      const toFix: Array<{ id: string; eaa_number: string }> = [];
      for (const app of applications) {
        if (!app.roster_key_id) continue;
        const roster = rosterByKeyId.get(app.roster_key_id);
        if (!roster) continue;
        const rosterEaa = (roster.eaa_number ?? "").trim();
        const appEaa = (app.eaa_number ?? "").trim();
        if (!rosterEaa || rosterEaa === appEaa) continue;
        const marker = `${app.id}:${rosterEaa}`;
        if (reconciledRef.current.has(marker)) continue;
        reconciledRef.current.add(marker);
        toFix.push({ id: app.id, eaa_number: rosterEaa });
      }
      if (toFix.length === 0) return;
      await Promise.all(
        toFix.map((f) =>
          supabase
            .from("new_member_applications")
            .update({ eaa_number: f.eaa_number } as any)
            .eq("id", f.id)
        )
      );
      queryClient.invalidateQueries({ queryKey: ["new-member-applications"] });
    })();
  }, [applications, linkedRosterRows, queryClient]);



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

  // Resolve the roster row linked to an application (roster_key_id first, EAA# fallback)
  const resolveRosterKeyId = async (app: any): Promise<number> => {
    if (app.roster_key_id) {
      const { data, error } = await supabase
        .from("roster_members")
        .select("key_id")
        .eq("key_id", app.roster_key_id)
        .maybeSingle();
      if (error) throw error;
      if (data) return data.key_id;
    }
    const eaa = (app.eaa_number ?? "").trim();
    if (eaa) {
      const { data, error } = await supabase
        .from("roster_members")
        .select("key_id")
        .eq("eaa_number", eaa)
        .order("key_id", { ascending: false })
        .limit(1);
      if (error) throw error;
      if (data?.[0]) return data[0].key_id;
    }
    throw new Error("No linked roster record found");
  };

  const setStandingAndArchive = async (app: any, archived: boolean) => {
    const keyId = await resolveRosterKeyId(app);

    const { error: rosterErr } = await supabase
      .from("roster_members")
      .update({ current_standing: archived ? "Inactive" : "Active" } as any)
      .eq("key_id", keyId);
    if (rosterErr) throw rosterErr;

    const { error: appErr } = await supabase
      .from("new_member_applications")
      .update({
        roster_key_id: keyId,
        archived_at: archived ? new Date().toISOString() : null,
        archived_by: archived ? user?.id ?? null : null,
        archived_by_name: archived ? user?.email ?? null : null,
      } as any)
      .eq("id", app.id);
    if (appErr) throw appErr;
  };

  const invalidateAfterArchive = () => {
    queryClient.invalidateQueries({ queryKey: ["new-member-applications"] });
    queryClient.invalidateQueries({ queryKey: ["members"] });
    queryClient.invalidateQueries({ queryKey: ["members-full"] });
    queryClient.invalidateQueries({ queryKey: ["application-roster-rows"] });
  };

  const archiveApplication = useMutation({
    mutationFn: (app: any) => setStandingAndArchive(app, true),
    onSuccess: () => {
      invalidateAfterArchive();
      toast({
        title: "Application archived",
        description: "The member is now Inactive and will be included in the next export.",
      });
      setArchiveApp(null);
      setDetailApp(null);
    },
    onError: (err: any) =>
      toast({ title: "Could not archive application", description: err.message, variant: "destructive" }),
  });

  const restoreApplication = useMutation({
    mutationFn: (app: any) => setStandingAndArchive(app, false),
    onSuccess: () => {
      invalidateAfterArchive();
      toast({ title: "Application restored", description: "The member is Active again." });
      setDetailApp(null);
    },
    onError: (err: any) =>
      toast({ title: "Could not restore application", description: err.message, variant: "destructive" }),
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
      toast({ title: "Payment reminder queued" });
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

  const sendWelcome = useMutation({
    mutationFn: async (app: any) => {
      const { data, error } = await supabase.functions.invoke("new-member-welcome", {
        body: { application_id: app.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["new-member-applications"] });
      toast({ title: "Welcome email queued" });
      setDetailApp(null);
    },
    onError: (err: any) => {
      toast({
        title: "Could not send welcome",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const recordFeePayment = useMutation({
    mutationFn: async () => {
      const app = feeDialogApp;
      if (!app) throw new Error("No application selected");
      const methodObj = PAYMENT_METHODS.find((m) => m.label === payMethod);
      if (!methodObj) throw new Error("Invalid method");
      const amountNum = parseFloat(payAmount);
      if (isNaN(amountNum) || amountNum <= 0) throw new Error("Invalid amount");

      const rosterMatches: ApplicationRosterMatch[] = [];

      if (app.roster_key_id) {
        const { data, error } = await supabase
          .from("roster_members")
          .select("key_id, member_type, current_standing, expiration_date")
          .eq("key_id", app.roster_key_id)
          .maybeSingle();
        if (error) throw error;
        if (data) rosterMatches.push(data);
      }

      if (app.eaa_number) {
        const { data, error } = await supabase
          .from("roster_members")
          .select("key_id, member_type, current_standing, expiration_date")
          .eq("eaa_number", app.eaa_number)
          .order("key_id", { ascending: false })
          .limit(1);
        if (error) throw error;
        if (data?.[0] && !rosterMatches.some((m) => m.key_id === data[0].key_id)) {
          rosterMatches.push(data[0]);
        }
      }

      const rosterMatch = rosterMatches[0];
      if (!rosterMatch) throw new Error("No linked roster record found");

      const udf1Value = `${format(payDate, "MM/dd/yyyy")} $${amountNum}/${methodObj.code}`;
      const recorderName = user?.email ?? "Unknown";
      const newExpiration = getSecondTuesdayOfMarchNextYear();

      const { error: payErr } = await supabase
        .from("dues_payments" as any)
        .insert({
          key_id: rosterMatch.key_id,
          payment_date: format(payDate, "yyyy-MM-dd"),
          amount: amountNum,
          method: payMethod,
          method_code: methodObj.code,
          new_expiration_date: newExpiration,
          old_expiration_date: rosterMatch.expiration_date,
          old_standing: rosterMatch.current_standing,
          recorded_by: user?.id,
          recorded_by_name: recorderName,
        } as any);
      if (payErr) throw payErr;

      const { error: rosterErr } = await supabase
        .from("roster_members")
        .update({ udf1_text: udf1Value } as any)
        .eq("key_id", rosterMatch.key_id);
      if (rosterErr) throw rosterErr;

      const { error: appErr } = await supabase
        .from("new_member_applications")
        .update({ fees_verified: true, roster_key_id: rosterMatch.key_id } as any)
        .eq("id", app.id);
      if (appErr) throw appErr;

      return { ...app, roster_key_id: rosterMatch.key_id };
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
      const defaultAmount = getProRatedAmountForApp(app);
      setPayAmount(defaultAmount > 0 ? String(defaultAmount) : "");
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

  // Sync check: the applicant must currently exist in the roster (matched by
  // stable roster_key_id, with EAA# fallback) AND the roster must have been
  // re-imported after the application was processed. We don't rely on
  // roster_members.last_import_id because it only updates when a specific row
  // is modified in an import — unchanged rows keep an old value.
  const isSynced = (app: any) => {
    const hasRosterRow =
      (app.roster_key_id && rosterByKeyId.has(app.roster_key_id)) ||
      rosterByEaa.has((app.eaa_number ?? "").trim());
    if (!hasRosterRow) return false;
    if (!lastSync) return false;
    const reference = app.processed_at ? new Date(app.processed_at) : new Date(app.created_at);
    return lastSync >= reference;
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
            <SelectItem value="incomplete">Incomplete</SelectItem>
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
                      {(() => {
                        const days = differenceInCalendarDays(new Date(), new Date(app.created_at));
                        return ` · ${days} day${days === 1 ? "" : "s"} ago`;
                      })()}
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {existingEaaSet.has(app.eaa_number?.trim()) && !app.processed && (
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
                      ) : app.archived_at ? (
                        <Badge variant="outline" className="text-xs bg-muted text-muted-foreground gap-1">
                          <Archive className="h-3 w-3" />
                          Incomplete
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Pending</Badge>
                      )}
                      {app.reminder_sent_at && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 gap-1">
                          <Mail className="h-3 w-3" />
                          Reminder Sent
                        </Badge>
                      )}
                      {app.welcome_sent_at && (
                        <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                          <Mail className="h-3 w-3" />
                          Welcome Sent
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
              {duplicateFor(detailApp) && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Possible duplicate</p>
                    <p className="text-xs">
                      EAA #{detailApp.eaa_number} already belongs to an existing member in the roster
                      ({duplicateFor(detailApp)?.first_name} {duplicateFor(detailApp)?.last_name} –{" "}
                      {duplicateFor(detailApp)?.member_type}, {duplicateFor(detailApp)?.current_standing}).
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
                  <span className="text-muted-foreground">Payment Reminder Sent</span>
                  <p className="font-medium">
                    {format(new Date(detailApp.reminder_sent_at), "MMMM d, yyyy h:mm a")}
                  </p>
                </div>
              )}
              {detailApp.welcome_sent_at && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Welcome Email Sent</span>
                  <p className="font-medium">
                    {format(new Date(detailApp.welcome_sent_at), "MMMM d, yyyy h:mm a")}
                  </p>
                </div>
              )}
              {detailApp.archived_at && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Archived as Incomplete</span>
                  <p className="font-medium">
                    {format(new Date(detailApp.archived_at), "MMMM d, yyyy h:mm a")}
                    {detailApp.archived_by_name ? ` · ${detailApp.archived_by_name}` : ""}
                  </p>
                </div>
              )}
              </div>

              <div className="pt-2 border-t border-border space-y-2">
                <p className="text-xs text-muted-foreground">
                  Emails are sent to <strong>{detailApp.email}</strong> with a copy to <strong>membership@eaa84.org</strong>.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  {detailApp.reminder_sent_at ? (
                    <Button variant="outline" size="sm" disabled className="w-full sm:w-auto">
                      <Mail className="h-4 w-4 mr-2" />
                      Reminder sent · {format(new Date(detailApp.reminder_sent_at), "MMM d")}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                      disabled={sendReminder.isPending || detailApp.fees_verified}
                      title={detailApp.fees_verified ? "Dues already verified" : undefined}
                      onClick={() => sendReminder.mutate(detailApp)}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      {sendReminder.isPending ? "Sending..." : "Payment Reminder"}
                    </Button>
                  )}

                  {detailApp.welcome_sent_at ? (
                    <Button variant="outline" size="sm" disabled className="w-full sm:w-auto">
                      <Mail className="h-4 w-4 mr-2" />
                      Welcome sent · {format(new Date(detailApp.welcome_sent_at), "MMM d")}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                      disabled={sendWelcome.isPending || !detailApp.fees_verified || !!detailApp.archived_at}
                      title={!detailApp.fees_verified ? "Mark dues verified first" : undefined}
                      onClick={() => sendWelcome.mutate(detailApp)}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      {sendWelcome.isPending ? "Sending..." : "Application Completed"}
                    </Button>
                  )}

                  {!detailApp.processed && (
                    detailApp.archived_at ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                        disabled={restoreApplication.isPending}
                        onClick={() => restoreApplication.mutate(detailApp)}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        {restoreApplication.isPending ? "Restoring..." : "Restore Application"}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto text-destructive hover:text-destructive"
                        onClick={() => setArchiveApp(detailApp)}
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        Archive as Incomplete
                      </Button>
                    )
                  )}
                </div>
              </div>
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
