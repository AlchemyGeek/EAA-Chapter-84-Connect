import { Button } from "@/components/ui/button";
import { LayoutGrid, List } from "lucide-react";

export type FeedView = "cards" | "list";

export function FeedToggle({
  value,
  onChange,
}: {
  value: FeedView;
  onChange: (v: FeedView) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-border">
      <Button
        type="button"
        variant={value === "cards" ? "secondary" : "ghost"}
        size="icon"
        className="rounded-r-none h-9 w-9"
        onClick={() => onChange("cards")}
        aria-label="Card view"
        title="Card view"
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant={value === "list" ? "secondary" : "ghost"}
        size="icon"
        className="rounded-l-none h-9 w-9 border-l border-border"
        onClick={() => onChange("list")}
        aria-label="List view"
        title="List view"
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  );
}
