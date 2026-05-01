import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

type MembershipStatus = "good" | "expiring" | "lapsed";

function computeStatus(
  currentStanding: string | null,
  expirationDate: string | null,
  memberType: string | null
): { status: MembershipStatus; message: string; coverageYear: number | null; overdue: boolean; isProspect: boolean } {
  const now = new Date();
  const expDate = expirationDate ? new Date(expirationDate) : null;
  const isProspect = (memberType || "").toLowerCase() === "prospect";

  if (currentStanding !== "Active") {
    if (isProspect) {
      return {
        status: "lapsed",
        message:
          "Your membership application is being processed. Please log back in in a few days to access full member features.",
        coverageYear: null,
        overdue: false,
        isProspect: true,
      };
    }
    return {
      status: "lapsed",
      message: expDate
        ? `Your membership is inactive. Last expiration: ${expDate.toLocaleDateString()}.`
        : "Your membership is inactive.",
      coverageYear: null,
      overdue: false,
      isProspect: false,
    };
  }

  if (!expDate) {
    return { status: "good", message: "You're in good standing.", coverageYear: null, overdue: false };
  }

  const coverageYear = expDate.getFullYear() - 1;

  if (expDate < now) {
    return {
      status: "expiring",
      message: `Your dues expired on ${expDate.toLocaleDateString()}. Please renew to stay current.`,
      coverageYear,
      overdue: true,
    };
  }

  const daysUntil = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntil <= 60) {
    return {
      status: "expiring",
      message: `Your dues expire in ${daysUntil} days. Please renew to stay current.`,
      coverageYear,
      overdue: false,
    };
  }

  return { status: "good", message: `You're in good standing through ${coverageYear}.`, coverageYear, overdue: false };
}

const statusConfig: Record<
  MembershipStatus,
  { icon: typeof CheckCircle2; label: string; badgeClass: string; cardClass: string }
> = {
  good: {
    icon: CheckCircle2,
    label: "Active — Good Standing",
    badgeClass: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    cardClass: "border-green-200 dark:border-green-800",
  },
  expiring: {
    icon: AlertTriangle,
    label: "Active — Expiring Soon",
    badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    cardClass: "border-amber-200 dark:border-amber-800",
  },
  lapsed: {
    icon: XCircle,
    label: "Inactive",
    badgeClass: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    cardClass: "border-red-200 dark:border-red-800",
  },
};

interface StatusDashboardProps {
  currentStanding: string | null;
  expirationDate: string | null;
  eaaExpiration: string | null;
  memberType: string | null;
  eaaNumber: string | null;
  officerRole?: string | null;
}

export function StatusDashboard({
  currentStanding,
  expirationDate,
  eaaExpiration,
  memberType,
  eaaNumber,
  officerRole,
}: StatusDashboardProps) {
  const { status, message, overdue } = computeStatus(currentStanding, expirationDate);
  const config = statusConfig[status];
  const Icon = config.icon;
  const displayLabel = status === "expiring" && overdue ? "Active — Membership Overdue" : config.label;

  return (
    <Card className={config.cardClass}>
      <CardContent className="p-4 md:p-6">
        <div className="flex items-start gap-3">
          <Icon className="h-6 w-6 mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.badgeClass}`}>
                {displayLabel}
              </span>
              {memberType && (
                <Badge variant="secondary" className="text-xs">
                  {memberType}
                </Badge>
              )}
              {officerRole && (
                <Badge className="text-xs bg-accent text-accent-foreground">
                  {officerRole}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{message}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5">
              {expirationDate && (
                <p className="text-xs text-muted-foreground">
                  Chapter Exp: {new Date(expirationDate).toLocaleDateString()}
                </p>
              )}
              {eaaExpiration && (
                <p className="text-xs text-muted-foreground">
                  EAA National Exp: {new Date(eaaExpiration).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}