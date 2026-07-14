import type { SquawkSlide } from "./types";

// Test slides — one per category — used only when the banner is in test mode.
export const TEST_SQUAWK_SLIDES: SquawkSlide[] = [
  {
    key: "test-announcement",
    kind: "announcement",
    label: "Announcement",
    title: "Chapter meeting moved to Saturday 10am",
    body: "Please note the schedule change for this month's gathering at the hangar.",
    href: "#",
  },
  {
    key: "test-whats-new",
    kind: "whats_new",
    label: "What's New",
    title: "New Hangar Talk feature is live",
    body: "Share questions, help requests, and FYIs with the chapter.",
    href: "/hangar-talk",
  },
  {
    key: "test-welcome",
    kind: "welcome",
    label: "New Member",
    title: "Welcome, Jane (Janie) Doe!",
    body: "New to the pattern 🛩️ — say hi and help them feel at home.",
    mailto: "mailto:test@example.com?subject=Welcome",
  },
  {
    key: "test-classifieds",
    kind: "classifieds",
    label: "Classifieds",
    title: "Garmin G5 for sale — like new",
    body: "New listing in the chapter classifieds.",
    href: "/classifieds",
  },
  {
    key: "test-hangar-talk",
    kind: "hangar_talk",
    label: "Question",
    title: "Anyone flown into KJYO recently?",
    body: "Active in Hangar Talk — join the conversation.",
    href: "/hangar-talk",
  },
  {
    key: "test-volunteering",
    kind: "volunteering",
    label: "Volunteering",
    title: "Young Eagles rally — ground crew needed",
    body: "Help make the June rally a success. A couple of hours on Saturday morning.",
    href: "/member-volunteering/00000000-0000-0000-0000-000000000000",
  },
  {
    key: "test-quote",
    kind: "quote",
    label: "Quote",
    title: "\"Once you have tasted flight, you will forever walk the earth with your eyes turned skyward.\"",
    body: "— Leonardo da Vinci",
  },
];
