import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>
                <Button disabled>Post a Classified</Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Coming soon</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
