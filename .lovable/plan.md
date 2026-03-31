

# Hangar Talk — Implementation Plan

## Overview
A single-channel realtime chat for active members, accessible from the Member Home page. Supports text messages, image/PDF attachments, emoji reactions, @mentions, and admin message deletion.

## Database Changes

### 1. `hangar_talk_messages` table
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | default gen_random_uuid() |
| key_id | integer | poster's roster member key_id |
| author_name | text | denormalized "First Last" |
| content | text | max ~2000 chars |
| created_at | timestamptz | default now() |

RLS:
- SELECT: authenticated + active member (join roster_members, standing = 'Active')
- INSERT: authenticated + own key_id matches email + active standing
- DELETE: admin role only

Enable Supabase Realtime on this table.

### 2. `hangar_talk_attachments` table
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| message_id | uuid FK | references hangar_talk_messages on delete cascade |
| storage_path | text | path in storage bucket |
| file_name | text | original filename |
| file_type | text | 'image' or 'pdf' |
| file_size | integer | bytes |

RLS: same SELECT as messages; INSERT for active members.

### 3. `hangar_talk_reactions` table
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| message_id | uuid FK | on delete cascade |
| key_id | integer | reactor's key_id |
| emoji | text | one of 👍👏✅❤️ |
| created_at | timestamptz | |
| UNIQUE(message_id, key_id, emoji) | | prevents duplicates |

RLS: SELECT for active members; INSERT/DELETE for own reactions.

Enable Realtime on this table.

### 4. Storage bucket
Create a public `hangar-talk` bucket with RLS allowing active authenticated members to upload (images + PDFs, max 10MB enforced client-side).

## Frontend

### New page: `src/pages/HangarTalk.tsx`
- Route: `/hangar-talk` (outside AppLayout, standalone full-height page)
- Header bar with back-to-home arrow and title "Hangar Talk"
- Access guard: redirect if not active member
- **Message feed**: scrollable area, chronological, auto-scroll to bottom on new messages
- **Message bubbles**: author name, timestamp, content, inline image previews (tap to expand), PDF links with icon, reaction bar
- **Reactions**: clickable emoji buttons below each message; toggling adds/removes
- **@mentions**: typing `@` opens a member name autocomplete dropdown; mentioned names highlighted in message text
- **Sticky input bar** at bottom: text input (multi-line), paperclip attach button (file picker for JPG/PNG/PDF), send button
- **Admin delete**: trash icon on messages visible only to admins
- Mobile-first layout with large tap targets

### Member Home update
Add a "Hangar Talk" navigation card in the Member Services section (gated behind active membership like other services), using a `MessageSquare` icon.

### Route registration
Add `/hangar-talk` route in `App.tsx` (standalone, not inside AppLayout).

## Technical Details

- **Realtime**: Subscribe to `postgres_changes` on `hangar_talk_messages` and `hangar_talk_reactions` for live updates
- **Pagination**: Load latest 50 messages initially; "Load older" button fetches previous batch
- **File upload**: client-side validation (type + 10MB size + max 3 per message), upload to `hangar-talk` bucket, store paths in attachments table
- **@mentions**: query `get_directory_members()` for autocomplete; store raw `@FirstName LastName` in text; render with highlight styling
- **Character limit**: 2000 chars enforced client-side with counter

## Files to Create/Modify
1. **Migration SQL** — create tables, RLS policies, storage bucket, enable realtime
2. **`src/pages/HangarTalk.tsx`** — main chat page
3. **`src/App.tsx`** — add route
4. **`src/pages/MemberHome.tsx`** — add navigation card

