import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { ClassifiedForm } from "@/components/classifieds/ClassifiedForm";
import { PhoneNudgeBanner } from "@/components/classifieds/PhoneNudgeBanner";
import { useCreateListing, useCurrentMember } from "@/lib/classifieds/api";

export default function ClassifiedNew() {
  const navigate = useNavigate();
  const { data: member, isLoading } = useCurrentMember();
  const create = useCreateListing();

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!member) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <Link to="/classifieds" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Classifieds
        </Link>
        <div className="mt-8 rounded-md border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          We couldn't find your member record. Only active chapter members can post classifieds.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
      <Link to="/classifieds" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Classifieds
      </Link>
      <h1 className="mt-3 text-2xl font-semibold">Post a Classified</h1>

      <div className="mt-5">
        <PhoneNudgeBanner member={member} />
        <ClassifiedForm
          mode="create"
          submitting={create.isPending}
          onSubmit={async (values) => {
            try {
              const id = await create.mutateAsync({ values, member });
              toast.success("Your listing has been posted.");
              navigate(`/classifieds/${id}`);
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : "Failed to post listing";
              toast.error(msg);
            }
          }}
        />
      </div>
    </div>
  );
}
