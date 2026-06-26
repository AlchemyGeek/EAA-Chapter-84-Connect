import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  useIsSubscribed,
  useToggleSubscription,
} from "@/lib/hangarTalk/subscriptions";

export function SubscribeToggle({ postId }: { postId: string }) {
  const subscribed = useIsSubscribed(postId);
  const toggle = useToggleSubscription();

  async function onClick() {
    try {
      await toggle.mutateAsync({ postId, subscribe: !subscribed });
      toast.success(subscribed ? "Unsubscribed from this thread." : "Subscribed. You'll get a daily email digest when there's new activity.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <Button
      size="sm"
      variant={subscribed ? "secondary" : "outline"}
      onClick={onClick}
      disabled={toggle.isPending}
      aria-pressed={subscribed}
      className="min-h-[44px]"
    >
      {subscribed ? (
        <>
          <Bell className="h-4 w-4" /> Subscribed
        </>
      ) : (
        <>
          <BellOff className="h-4 w-4" /> Subscribe
        </>
      )}
    </Button>
  );
}
