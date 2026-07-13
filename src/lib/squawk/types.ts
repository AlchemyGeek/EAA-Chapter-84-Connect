export type SquawkEntryType = "announcement" | "whats_new";

export interface SquawkEntry {
  id: string;
  type: SquawkEntryType;
  title: string;
  message: string;
  link: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export type SquawkSlideKind =
  | "announcement"
  | "whats_new"
  | "welcome"
  | "classifieds"
  | "hangar_talk"
  | "volunteering"
  | "quote";

export interface SquawkSlide {
  key: string;
  kind: SquawkSlideKind;
  label: string;
  title: string;
  body: string;
  href?: string;
  mailto?: string;
}
