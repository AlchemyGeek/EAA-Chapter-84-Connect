import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageSquarePlus } from "lucide-react";

export function EmptyState({
  title,
  message,
  showPost = false,
}: {
  title: string;
  message: string;
  showPost?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-6 py-10 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      {showPost && (
        <Button asChild className="mt-4">
          <Link to="/hangar-talk/new">
            <MessageSquarePlus className="h-4 w-4" />
            Start the conversation
          </Link>
        </Button>
      )}
    </div>
  );
}
