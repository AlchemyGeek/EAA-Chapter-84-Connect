import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Search, CheckCircle, CircleDollarSign, PackageCheck, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

const PAYMENT_METHODS = [
  { label: "Cash", code: "cash" },
  { label: "Check", code: "check" },
  { label: "PayPal", code: "pp" },
  { label: "Square", code: "sq" },
] as const;

function getSecondTuesdayOfMarch(year: number): Date {
  const march1 = new Date(year, 2, 1);
  const dayOfWeek = march1.getDay();
  const daysUntilTuesday = (2 - dayOfWeek + 7) % 7;
  const firstTuesday = 1 + daysUntilTuesday;
  const secondTuesday = firstTuesday + 7;
  return new Date(year, 2, secondTuesday);
}

function computeNewExpiration(currentExpiration: string | null): Date {
  const now = new Date();
  const currentYear = now.getFullYear();

  if (!currentExpiration) {
    return getSecondTuesdayOfMarch(currentYear + 1);
  }

  const expDate = new Date(currentExpiration);
  const expYear = expDate.getFullYear();

  if (expYear > currentYear) {
    // Already beyond current year → advance by 1 year
    return getSecondTuesdayOfMarch(expYear + 1);
  }

  // Past or current year → advance to next year
  return getSecondTuesdayOfMarch(currentYear + 1);
}

type Member = {
  key_id: number;
  first_name: string | null;
  last_name: string | null;
  eaa_number: string | null;
  email: string | null;
  current_standing: string | null;
  expiration_date: string | null;
  eaa_expiration: string | null;
  member_type: string | null;
};

type DuesPayment = {
  id: string;
  key_id: number;
  payment_date: string;
  amount: number;
  method: string;
  method_code: string;
  new_expiration_date: string;
  old_expiration_date: string | null;
  old_standing: string | null;
  exported: boolean;
  recorded_by: string | null;
  created_at: string;
};

export default function DuesPayment() {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [filterMode, setFilterMode] = useState<"recent" | "all">("recent");

  // Fetch all members for search
  const { data: allMembers = [] } = useQuery({
    queryKey: ["dues-members-search"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roster_members")
        .select("key_id, first_name, last_name, eaa_number, email, current_standing, expiration_date, eaa_expiration, member_type")
        .order("last_name");
      if (error) throw error;
      return data as Member[];
    },
  });

  // Fetch payment history
  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["dues-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dues_payments" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) as DuesPayment[];
    },
  });

  // Filter search results
  const searchResults = useMemo(() => {
    if (searchTerm.length < 2) return [];
    const term = searchTerm.toLowerCase();
    return allMembers.filter(
      (m) =>
        (m.first_name?.toLowerCase().includes(term) || false) ||
        (m.last_name?.toLowerCase().includes(term) || false) ||
        (`${m.first_name} ${m.last_name}`.toLowerCase().includes(term)) ||
        (m.eaa_number?.includes(term) || false)
    ).slice(0, 10);
  }, [searchTerm, allMembers]);

  // Filtered payments
  const filteredPayments = useMemo(() => {
    if (filterMode === "recent") {
      return payments.filter((p) => !p.exported);
    }
    return payments;
  }, [payments, filterMode]);

  // Build a member lookup map for payment history display
  const memberMap = useMemo(() => {
    const map = new Map<number, Member>();
    allMembers.forEach((m) => map.set(m.key_id, m));
    return map;
  }, [allMembers]);

  const isInactive = selectedMember
    ? selectedMember.current_standing !== "Active" ||
      (selectedMember.expiration_date && new Date(selectedMember.expiration_date) < new Date())
    : false;

  const newExpiration = selectedMember
    ? computeNewExpiration(selectedMember.expiration_date)
    : null;

  // Process payment mutation
  const processPayment = useMutation({
    mutationFn: async () => {
      if (!selectedMember || !amount || !method || !newExpiration) throw new Error("Missing fields");

      const methodObj = PAYMENT_METHODS.find((m) => m.label === method);
      if (!methodObj) throw new Error("Invalid method");

      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0) throw new Error("Invalid amount");

      const payDateStr = format(paymentDate, "MM/dd/yyyy");
      const udf1Value = `${payDateStr} $${amountNum}/${methodObj.code}`;
      const newExpStr = format(newExpiration, "yyyy-MM-dd");

      // 1. Insert payment record
      const recorderName = currentUserMember
        ? `${currentUserMember.first_name} ${currentUserMember.last_name}`
        : user?.email ?? "Unknown";

      const { error: payErr } = await supabase
        .from("dues_payments" as any)
        .insert({
          key_id: selectedMember.key_id,
          payment_date: format(paymentDate, "yyyy-MM-dd"),
          amount: amountNum,
          method: method,
          method_code: methodObj.code,
          new_expiration_date: newExpStr,
          old_expiration_date: selectedMember.expiration_date,
          old_standing: selectedMember.current_standing,
          recorded_by: user?.id,
          recorded_by_name: recorderName,
        } as any);
      if (payErr) throw payErr;

      // 2. Update member: UDF1, expiration_date, current_standing
      const updates: Record<string, any> = {
        udf1_text: udf1Value,
        expiration_date: newExpStr,
      };
      if (isInactive) {
        updates.current_standing = "Active";
      }

      const { error: memberErr } = await supabase
        .from("roster_members")
        .update(updates)
        .eq("key_id", selectedMember.key_id);
      if (memberErr) throw memberErr;
    },
    onSuccess: () => {
      toast({ title: "Payment recorded", description: `Membership updated for ${selectedMember?.first_name} ${selectedMember?.last_name}` });
      // Reset form
      setSelectedMember(null);
      setSearchTerm("");
      setAmount("");
      setMethod("");
      setPaymentDate(new Date());
      queryClient.invalidateQueries({ queryKey: ["dues-payments"] });
      queryClient.invalidateQueries({ queryKey: ["dues-members-search"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Mark all as exported
  const markExported = useMutation({
    mutationFn: async () => {
      const unexported = payments.filter((p) => !p.exported).map((p) => p.id);
      if (unexported.length === 0) return;
      const { error } = await supabase
        .from("dues_payments" as any)
        .update({ exported: true } as any)
        .in("id", unexported);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Marked as exported" });
      queryClient.invalidateQueries({ queryKey: ["dues-payments"] });
    },
  });
  // Find current user's member name for recording
  const currentUserMember = useMemo(() => {
    if (!user?.email) return null;
    return allMembers.find((m) => m.email?.toLowerCase() === user.email!.toLowerCase()) ?? null;
  }, [user?.email, allMembers]);

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  }
  if (!user) return <Navigate to="/auth" replace />;

  const recentCount = payments.filter((p) => !p.exported).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/home">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Membership Due Payment</h1>
            <p className="text-sm text-muted-foreground mt-1">Record chapter membership payments and update member status.</p>
          </div>
        </div>

        {/* Member Search */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Select Member</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or EAA number..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (selectedMember) setSelectedMember(null);
                }}
                className="pl-9"
              />
            </div>

            {/* Search results */}
            {!selectedMember && searchResults.length > 0 && (
              <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                {searchResults.map((m) => (
                  <button
                    key={m.key_id}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex justify-between items-center"
                    onClick={() => {
                      setSelectedMember(m);
                      setSearchTerm(`${m.first_name} ${m.last_name}`);
                    }}
                  >
                    <span className="font-medium">{m.last_name}, {m.first_name}</span>
                    <span className="text-muted-foreground text-xs">EAA #{m.eaa_number}</span>
                  </button>
                ))}
              </div>
            )}

            {searchTerm.length >= 2 && searchResults.length === 0 && !selectedMember && (
              <p className="text-sm text-muted-foreground">No members found.</p>
            )}

            {/* Selected member info */}
            {selectedMember && (
              <Card className="bg-muted/30">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="font-semibold">
                      {selectedMember.first_name} {selectedMember.last_name}
                    </h3>
                    <div className="flex gap-1.5">
                      <Badge variant={isInactive ? "destructive" : "secondary"}>
                        {isInactive ? "Inactive" : "Active"}
                      </Badge>
                      {selectedMember.member_type && (
                        <Badge variant="outline" className="text-xs">{selectedMember.member_type}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div>
                      <span className="text-muted-foreground">EAA #: </span>
                      <span className="font-medium">{selectedMember.eaa_number || "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">EAA Exp: </span>
                      <span className="font-medium">
                        {selectedMember.eaa_expiration
                          ? format(new Date(selectedMember.eaa_expiration), "MMM d, yyyy")
                          : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Chapter Exp: </span>
                      <span className="font-medium">
                        {selectedMember.expiration_date
                          ? format(new Date(selectedMember.expiration_date), "MMM d, yyyy")
                          : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">New Exp: </span>
                      <span className="font-medium text-primary">
                        {newExpiration ? format(newExpiration, "MMM d, yyyy") : "—"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Payment Form */}
        {selectedMember && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CircleDollarSign className="h-4 w-4" />
                Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Payment Date */}
                <div className="space-y-2">
                  <Label>Payment Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !paymentDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {paymentDate ? format(paymentDate, "MMM d, yyyy") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={paymentDate}
                        onSelect={(d) => d && setPaymentDate(d)}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <Label>Amount ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="25.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>

                {/* Method */}
                <div className="space-y-2">
                  <Label>Method</Label>
                  <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m.code} value={m.label}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                className="w-full sm:w-auto min-h-[44px]"
                disabled={!amount || !method || processPayment.isPending}
                onClick={() => processPayment.mutate()}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {processPayment.isPending ? "Processing..." : "Record Payment"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Payment History */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-base">Payment History</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {filterMode === "recent"
                    ? `${recentCount} payment${recentCount !== 1 ? "s" : ""} since last export`
                    : `${payments.length} total payment${payments.length !== 1 ? "s" : ""}`}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select value={filterMode} onValueChange={(v) => setFilterMode(v as "recent" | "all")}>
                  <SelectTrigger className="h-8 w-[150px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Since Last Export</SelectItem>
                    <SelectItem value="all">All Payments</SelectItem>
                  </SelectContent>
                </Select>
                {recentCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1"
                    onClick={() => markExported.mutate()}
                    disabled={markExported.isPending}
                  >
                    <PackageCheck className="h-3 w-3" />
                    Mark Exported
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {paymentsLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : filteredPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {filterMode === "recent" ? "No payments since last export." : "No payments recorded yet."}
              </p>
            ) : isMobile ? (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredPayments.map((p) => {
                  const m = memberMap.get(p.key_id);
                  return (
                    <Card key={p.id}>
                      <CardContent className="p-3 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-sm">
                            {m ? `${m.last_name}, ${m.first_name}` : `Key ${p.key_id}`}
                          </span>
                          <span className="font-semibold text-sm">${Number(p.amount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{p.method} · {format(new Date(p.payment_date), "MMM d, yyyy")}</span>
                          <span>→ {format(new Date(p.new_expiration_date), "MMM d, yyyy")}</span>
                        </div>
                        {(p as any).recorded_by_name && (
                          <p className="text-xs text-muted-foreground">Received by: {(p as any).recorded_by_name}</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-md border max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>New Expiration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((p) => {
                      const m = memberMap.get(p.key_id);
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">
                            {m ? `${m.last_name}, ${m.first_name}` : `Key ${p.key_id}`}
                          </TableCell>
                          <TableCell>{format(new Date(p.payment_date), "MMM d, yyyy")}</TableCell>
                          <TableCell>${Number(p.amount).toFixed(2)}</TableCell>
                          <TableCell>{p.method}</TableCell>
                          <TableCell>{format(new Date(p.new_expiration_date), "MMM d, yyyy")}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
