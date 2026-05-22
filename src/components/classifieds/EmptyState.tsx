import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Props {
  message: string;
  showPostButton?: boolean;
}

export function EmptyState({ message, showPostButton }: Props) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-md border bg-muted/20 px-6 py-12 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      {showPostButton && (
        <Button asChild>
          <Link to="/classifieds/new">Post a Classified</Link>
        </Button>
      )}
    </div>
  );
}
