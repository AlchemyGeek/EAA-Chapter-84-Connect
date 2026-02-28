import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

type MembershipStatus = "good" | "expiring" | "lapsed";

function computeStatus(
  currentStanding: string | null,
  expirationDate: string | null
): { status: MembershipStatus; message: string; coverageYear: number | null } {
  const now = new Date();
  const expDate = expirationDate ? new Date(expirationDate) : null;

  // If not active or no expiration → lapsed
  if (currentStanding !== "Active" || !expDate) {
    return {
      status: "lapsed",
      message: expDate
        ? `Your membership expired on ${expDate.toLocaleDateString()}.`
        : "No expiration date on file.",
      coverageYear: null,
    };
  }

  // Expiration date is in the past
  if (expDate < now) {
    return {
      status: "lapsed",
      message: `Your membership expired on ${expDate.toLocaleDateString()}.`,
      coverageYear: null,
    };
  }

  // Coverage year = expiration year - 1 (e.g. expires 03/10/2027 → covered through 2026)
  const coverageYear = expDate.getFullYear() - 1;

  // Expiring within 60 days
  const daysUntil = Math.ceil(
    (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysUntil <= 60) {
    return {
      status: "expiring",
      message: `Your membership expires in ${daysUntil} days. Please renew to stay current.`,
      coverageYear,
    };
  }

  return {
    status: "good",
    message: `You're in good standing through ${coverageYear}.`,
    coverageYear,
  };
}

const statusConfig: Record<
  MembershipStatus,
  {
    icon: typeof CheckCircle2;
    label: string;
    badgeClass: string;
    cardClass: string;
  }
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
  memberType: string | null;
  eaaNumber: string | null;
}

export function StatusDashboard({
  currentStanding,
  expirationDate,
  memberType,
  eaaNumber,
}: StatusDashboardProps) {
  const { status, message } = computeStatus(currentStanding, expirationDate);
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Card className={config.cardClass}>
      <CardContent className="p-4 md:p-6">
        <div className="flex items-start gap-3">
          <Icon className="h-6 w-6 mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.badgeClass}`}>
                {config.label}
              </span>
              {memberType && (
                <Badge variant="secondary" className="text-xs">
                  {memberType}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{message}</p>
            {eaaNumber && (
              <p className="text-xs text-muted-foreground">
                EAA #{eaaNumber}
              </p>
            )}
            {expirationDate && (
              <p className="text-xs text-muted-foreground">
                Expiration: {new Date(expirationDate).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
        {status === "lapsed" && (
          <div className="mt-4 rounded-md bg-destructive/10 p-3">
            <p className="text-sm font-medium text-destructive">
              Please contact your chapter to renew your membership.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
