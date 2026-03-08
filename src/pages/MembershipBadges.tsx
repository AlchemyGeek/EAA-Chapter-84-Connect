import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Search, Award, AlertTriangle, CheckCircle2, XCircle, Users, BadgeCheck } from "lucide-react";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

export default function MembershipBadges() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedKeyId, setSelectedKeyId] = useState<number | null>(null);

  // Summary stats
  const { data: badgeCount = 0 } = useQuery({
    queryKey: ["badge-delivery-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("badge_deliveries")
        .select("*", { count: "exact", head: true })
        .eq("year", 2026);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: currentMemberCount = 0 } = useQuery({
    queryKey: ["current-member-count-2026"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("roster_members")
        .select("*", { count: "exact", head: true })
        .eq("current_standing", "Active")
        .gte("expiration_date", "2026-03-01");
      if (error) throw error;
      return count ?? 0;
    },
  });

  // Search members
  const { data: searchResults = [] } = useQuery({
    queryKey: ["badge-member-search", search],
    enabled: search.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roster_members")
        .select("key_id, first_name, last_name, eaa_number, email")
        .or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
        .order("last_name")
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  // Fetch selected member details
  const { data: selectedMember } = useQuery({
    queryKey: ["badge-member", selectedKeyId],
    enabled: !!selectedKeyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roster_members")
        .select("key_id, first_name, last_name, eaa_number, current_standing, expiration_date")
        .eq("key_id", selectedKeyId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Check if member has paid 2026 dues
  const { data: duesPayment } = useQuery({
    queryKey: ["badge-dues-check", selectedKeyId],
    enabled: !!selectedKeyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dues_payments")
        .select("id, payment_date, amount, new_expiration_date")
        .eq("key_id", selectedKeyId!)
        .gte("new_expiration_date", "2026-01-01")
        .order("payment_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Check badge delivery status
  const { data: badgeDelivery } = useQuery({
    queryKey: ["badge-delivery", selectedKeyId],
    enabled: !!selectedKeyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("badge_deliveries")
        .select("*")
        .eq("key_id", selectedKeyId!)
        .eq("year", 2026)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Get officer name for recording
  const { data: officerMember } = useQuery({
    queryKey: ["officer-name", user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roster_members")
        .select("first_name, last_name")
        .eq("email", user!.email!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const deliverBadge = useMutation({
    mutationFn: async () => {
      const officerName = officerMember
        ? `${officerMember.first_name} ${officerMember.last_name}`
        : user?.email ?? "Unknown";
      const { error } = await supabase.from("badge_deliveries").insert({
        key_id: selectedKeyId!,
        year: 2026,
        delivered_by: user!.id,
        delivered_by_name: officerName,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["badge-delivery", selectedKeyId] });
      toast({ title: "Badge marked as delivered" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Member is considered paid if there's a dues_payments record OR their expiration_date covers 2026
  const paidViaDuesTable = !!duesPayment;
  const paidViaExpiration = !!selectedMember?.expiration_date &&
    new Date(selectedMember.expiration_date) >= new Date("2026-03-01");
  const hasPaid = paidViaDuesTable || paidViaExpiration;
  const alreadyDelivered = !!badgeDelivery;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-bold">2026 Membership Badges</h1>
      <p className="text-sm text-muted-foreground">
        Search for a member to check their dues status and mark their badge as delivered.
      </p>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{currentMemberCount}</p>
              <p className="text-xs text-muted-foreground">Current Members</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <BadgeCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{badgeCount}</p>
              <p className="text-xs text-muted-foreground">Badges Delivered</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by member name..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSelectedKeyId(null);
          }}
          className="pl-9"
        />
      </div>

      {/* Search results */}
      {search.length >= 2 && !selectedKeyId && searchResults.length > 0 && (
        <Card>
          <CardContent className="p-2">
            {searchResults.map((m) => (
              <button
                key={m.key_id}
                onClick={() => {
                  setSelectedKeyId(m.key_id);
                  setSearch(`${m.first_name} ${m.last_name}`);
                }}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-muted text-sm flex justify-between items-center"
              >
                <span className="font-medium">{m.first_name} {m.last_name}</span>
                <span className="text-xs text-muted-foreground">EAA #{m.eaa_number}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {search.length >= 2 && !selectedKeyId && searchResults.length === 0 && (
        <p className="text-sm text-muted-foreground">No members found.</p>
      )}

      {/* Selected member details */}
      {selectedMember && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              {selectedMember.first_name} {selectedMember.last_name}
              <Badge variant="outline" className="ml-auto text-xs">
                EAA #{selectedMember.eaa_number}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Dues status */}
            {hasPaid ? (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-green-700 font-medium">
                  {paidViaDuesTable
                    ? `2026 dues paid — $${duesPayment!.amount} on ${new Date(duesPayment!.payment_date).toLocaleDateString()}`
                    : `2026 dues confirmed — membership active through ${new Date(selectedMember!.expiration_date!).toLocaleDateString()}`
                  }
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <XCircle className="h-4 w-4 text-destructive" />
                <span className="text-destructive font-medium">
                  No 2026 dues payment found
                </span>
              </div>
            )}

            {/* Badge delivery */}
            {alreadyDelivered && (
              <Alert className="border-amber-300 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">Badge Already Delivered</AlertTitle>
                <AlertDescription className="text-amber-700 text-xs">
                  Delivered on {new Date(badgeDelivery.delivered_at).toLocaleDateString()}
                  {badgeDelivery.delivered_by_name && ` by ${badgeDelivery.delivered_by_name}`}
                </AlertDescription>
              </Alert>
            )}

            {hasPaid && !alreadyDelivered && (
              <div className="flex items-center gap-3 pt-2">
                <Checkbox
                  id="deliver-badge"
                  onCheckedChange={(checked) => {
                    if (checked) deliverBadge.mutate();
                  }}
                  disabled={deliverBadge.isPending}
                />
                <Label htmlFor="deliver-badge" className="text-sm cursor-pointer">
                  Badge has been delivered
                </Label>
              </div>
            )}

            {!hasPaid && (
              <p className="text-xs text-muted-foreground">
                This member must pay their 2026 dues before a badge can be issued.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
