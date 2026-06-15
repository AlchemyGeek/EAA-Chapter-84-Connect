import { Badge } from "@/components/ui/badge";
import { POST_TYPE_LABEL, type PostType } from "@/lib/hangarTalk/types";
import { HelpCircle, LifeBuoy, Megaphone } from "lucide-react";

const STYLES: Record<PostType, string> = {
  question:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  help_wanted:
    "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  fyi: "bg-muted text-foreground/80 border-border",
};

const ICONS: Record<PostType, typeof HelpCircle> = {
  question: HelpCircle,
  help_wanted: LifeBuoy,
  fyi: Megaphone,
};

export function TypeBadge({ type, className = "" }: { type: PostType; className?: string }) {
  const Icon = ICONS[type];
  return (
    <Badge
      variant="outline"
      className={`gap-1 font-medium ${STYLES[type]} ${className}`}
    >
      <Icon className="h-3 w-3" />
      {POST_TYPE_LABEL[type]}
    </Badge>
  );
}
