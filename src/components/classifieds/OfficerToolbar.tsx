import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import type { Listing } from "@/lib/classifieds/types";

interface Props {
  listing: Listing;
  onDelete: () => void;
  onToggleHidden: () => void;
}

export function OfficerToolbar({ listing, onDelete, onToggleHidden }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isHidden = listing.dbStatus === "hidden";

  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Moderation
      </p>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to={`/classifieds/${listing.id}/edit`}>
            <Pencil className="h-4 w-4" /> Edit
          </Link>
        </Button>

        <Button variant="outline" size="sm" onClick={onToggleHidden}>
          {isHidden ? (
            <>
              <Eye className="h-4 w-4" /> Unhide
            </>
          ) : (
            <>
              <EyeOff className="h-4 w-4" /> Hide
            </>
          )}
        </Button>

        <Button variant="destructive" size="sm" onClick={() => setConfirmOpen(true)}>
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this listing? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
