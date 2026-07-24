import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyProfile from "./tools/get-my-profile";
import listDirectory from "./tools/list-directory";
import listHangarTalk from "./tools/list-hangar-talk";
import listClassifieds from "./tools/list-classifieds";
import listVolunteering from "./tools/list-volunteering";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "eaa84-connect-mcp",
  title: "EAA Chapter 84 Connect",
  version: "0.1.0",
  instructions:
    "Tools for EAA Chapter 84 Connect. Callers act as their signed-in member account. Use get_my_profile for membership status, list_directory to look up members, and list_hangar_talk_posts / list_classifieds / list_volunteering_opportunities for chapter activity.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMyProfile, listDirectory, listHangarTalk, listClassifieds, listVolunteering],
});
