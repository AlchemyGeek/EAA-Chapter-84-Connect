import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, MailX } from "lucide-react";

type Status = "managed" | "invalid" | "success";

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const hangarTalkStatus = searchParams.get("source") === "hangar-talk" ? searchParams.get("status") : null;
  const status: Status =
    hangarTalkStatus === "success" ? "success" : hangarTalkStatus === "invalid" ? "invalid" : "managed";


  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center space-y-4">
          {status === "managed" && (
            <>
              <MailX className="mx-auto h-10 w-10 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Unsubscribe</h2>
              <p className="text-muted-foreground">
                To stop receiving Chapter 84 Connect emails, use the unsubscribe link at the
                bottom of any email we've sent you.
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="mx-auto h-10 w-10 text-green-600" />
              <h2 className="text-xl font-semibold text-foreground">Unsubscribed</h2>
              <p className="text-muted-foreground">
                You have been successfully unsubscribed from these emails.
              </p>
            </>
          )}

          {status === "invalid" && (
            <>
              <XCircle className="mx-auto h-10 w-10 text-destructive" />
              <h2 className="text-xl font-semibold text-foreground">Invalid Link</h2>
              <p className="text-muted-foreground">
                This unsubscribe link is invalid or has expired.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Unsubscribe;
