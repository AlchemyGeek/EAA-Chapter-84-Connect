import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2, MailX } from "lucide-react";

type Status = "loading" | "valid" | "already_unsubscribed" | "invalid" | "success" | "error";

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    const validate = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const res = await fetch(
          `${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}`,
          { headers: { apikey: anonKey } }
        );
        const data = await res.json();
        if (!res.ok) {
          setStatus("invalid");
        } else if (data.valid === false && data.reason === "already_unsubscribed") {
          setStatus("already_unsubscribed");
        } else if (data.valid) {
          setStatus("valid");
        } else {
          setStatus("invalid");
        }
      } catch {
        setStatus("invalid");
      }
    };
    validate();
  }, [token]);

  const handleConfirm = async () => {
    if (!token) return;
    setConfirming(true);
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) {
        setStatus("error");
      } else if (data?.success) {
        setStatus("success");
      } else if (data?.reason === "already_unsubscribed") {
        setStatus("already_unsubscribed");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Validating your request...</p>
            </>
          )}

          {status === "valid" && (
            <>
              <MailX className="mx-auto h-10 w-10 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Unsubscribe</h2>
              <p className="text-muted-foreground">
                Are you sure you want to unsubscribe from Chapter 84 Connect emails?
              </p>
              <Button onClick={handleConfirm} disabled={confirming} variant="destructive">
                {confirming ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                ) : (
                  "Confirm Unsubscribe"
                )}
              </Button>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="mx-auto h-10 w-10 text-green-600" />
              <h2 className="text-xl font-semibold text-foreground">Unsubscribed</h2>
              <p className="text-muted-foreground">
                You have been successfully unsubscribed from Chapter 84 Connect emails.
              </p>
            </>
          )}

          {status === "already_unsubscribed" && (
            <>
              <CheckCircle className="mx-auto h-10 w-10 text-muted-foreground" />
              <h2 className="text-xl font-semibold text-foreground">Already Unsubscribed</h2>
              <p className="text-muted-foreground">
                You have already been unsubscribed from these emails.
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

          {status === "error" && (
            <>
              <XCircle className="mx-auto h-10 w-10 text-destructive" />
              <h2 className="text-xl font-semibold text-foreground">Something Went Wrong</h2>
              <p className="text-muted-foreground">
                We couldn't process your request. Please try again later.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Unsubscribe;
