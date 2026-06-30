// Hangar Talk daily digest.
// Iterates subscriptions with new replies since last notification, builds one
// email per recipient summarizing all their threads, and enqueues via the
// shared Lovable Emails pipeline.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { signToken } from "../_shared/hangarTalkToken.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const APP_URL = "https://eaa84connect.lovable.app";
const FROM_ADDR = "EAA Chapter 84 <notify@notify.eaa84.org>";
const SENDER_DOMAIN = "notify.eaa84.org";
const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const TYPE_LABEL: Record<string, string> = {
  question: "Question",
  help_wanted: "Help Wanted",
  fyi: "FYI",
};
const TYPE_COLOR: Record<string, string> = {
  question: "#1e3a5f",
  help_wanted: "#b3541e",
  fyi: "#3b6e3b",
};

function authorName(a: { first_name: string | null; last_name: string | null; nickname: string | null } | undefined): string {
  if (!a) return "A member";
  const nick = a.nickname?.trim();
  const first = a.first_name?.trim() ?? "";
  const last = a.last_name?.trim() ?? "";
  if (nick) return `${first} (${nick}) ${last}`.trim();
  return `${first} ${last}`.trim() || "A member";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const linkSecret = Deno.env.get("HANGAR_TALK_LINK_SECRET")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Pull every subscription with the related post + recipient email.
    const { data: subs, error: subsErr } = await supabase
      .from("hangar_talk_subscriptions")
      .select(
        "id, post_id, key_id, created_at, last_notified_at, " +
          "hangar_talk_posts!inner(id, type, title, last_activity_at, resolved_at), " +
          "roster_members!inner(key_id, email, first_name, last_name, nickname)",
      );
    if (subsErr) throw subsErr;

    // Group by recipient email.
    const byRecipient = new Map<string, Array<any>>();
    for (const s of subs ?? []) {
      const email = (s as any).roster_members?.email as string | null;
      if (!email) continue;
      const arr = byRecipient.get(email.toLowerCase()) ?? [];
      arr.push(s);
      byRecipient.set(email.toLowerCase(), arr);
    }

    let recipientsEmailed = 0;
    const nowIso = new Date().toISOString();

    for (const [recipient, recipientSubs] of byRecipient) {
      // Check suppression list first.
      const { data: suppressed } = await supabase
        .from("suppressed_emails")
        .select("email")
        .eq("email", recipient)
        .maybeSingle();
      if (suppressed) continue;

      const keyId = (recipientSubs[0] as any).roster_members.key_id as number;

      // For each subscription, find new replies since last_notified_at (or sub created_at).
      const sections: string[] = [];
      const textSections: string[] = [];
      const subIdsToTouch: string[] = [];

      for (const s of recipientSubs) {
        const post = (s as any).hangar_talk_posts;
        const since = (s as any).last_notified_at ?? (s as any).created_at;

        const { data: newReplies, error: repErr } = await supabase
          .from("hangar_talk_replies")
          .select("id, body, created_at, author_key_id")
          .eq("post_id", post.id)
          .gt("created_at", since)
          .order("created_at", { ascending: false });
        if (repErr) {
          console.error("reply fetch failed", repErr.message);
          continue;
        }
        if (!newReplies || newReplies.length === 0) continue;

        // Latest reply author for preview.
        const latest = newReplies[0];
        const { data: authorRow } = await supabase
          .from("roster_members")
          .select("first_name, last_name, nickname")
          .eq("key_id", latest.author_key_id)
          .maybeSingle();

        const previewText = String(latest.body ?? "").replace(/\s+/g, " ").trim();
        const previewTrim = previewText.length > 220
          ? previewText.slice(0, 217) + "…"
          : previewText;

        const viewToken = await signToken(
          {
            a: "view",
            e: recipient,
            p: post.id,
            k: keyId,
            x: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
          },
          linkSecret,
        );
        const unsubThreadToken = await signToken(
          {
            a: "unsub-thread",
            e: recipient,
            p: post.id,
            k: keyId,
            x: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
          },
          linkSecret,
        );

        const viewUrl = `${supabaseUrl}/functions/v1/hangar-talk-link?token=${encodeURIComponent(viewToken)}`;
        const unsubThreadUrl = `${supabaseUrl}/functions/v1/hangar-talk-link?token=${encodeURIComponent(unsubThreadToken)}`;

        const typeLabel = TYPE_LABEL[post.type] ?? post.type;
        const typeColor = TYPE_COLOR[post.type] ?? "#1e3a5f";

        sections.push(`
<div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:14px;">
  <div style="margin-bottom:6px;">
    <span style="display:inline-block;background:${typeColor};color:#ffffff;font-size:11px;font-weight:600;padding:3px 8px;border-radius:999px;text-transform:uppercase;letter-spacing:0.04em;">${escapeHtml(typeLabel)}</span>
  </div>
  <div style="font-size:16px;font-weight:600;color:#1e3a5f;margin-bottom:4px;">${escapeHtml(post.title)}</div>
  <div style="font-size:13px;color:#6b7280;margin-bottom:10px;">${newReplies.length} new ${newReplies.length === 1 ? "reply" : "replies"}</div>
  <div style="font-size:14px;color:#374151;line-height:1.5;margin-bottom:14px;">
    <span style="color:#6b7280;">${escapeHtml(authorName(authorRow ?? undefined))}:</span> ${escapeHtml(previewTrim)}
  </div>
  <a href="${viewUrl}" style="display:inline-block;background:#1e3a5f;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:10px 18px;border-radius:6px;">View Thread</a>
</div>`);
        textSections.push(
          `[${typeLabel}] ${post.title}\n` +
            `${newReplies.length} new ${newReplies.length === 1 ? "reply" : "replies"}\n` +
            `${authorName(authorRow ?? undefined)}: ${previewTrim}\n` +
            `View: ${viewUrl}\n`,
        );
        subIdsToTouch.push((s as any).id);
      }

      if (sections.length === 0) continue;

      const unsubAllToken = await signToken(
        {
          a: "unsub-all",
          e: recipient,
          k: keyId,
          x: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
        },
        linkSecret,
      );
      const unsubAllUrl = `${supabaseUrl}/functions/v1/hangar-talk-link?token=${encodeURIComponent(unsubAllToken)}`;

      // The Lovable email API requires an unsubscribe_token on every
      // transactional send. Fetch or create the recipient's global token so
      // the pipeline appends its standard unsubscribe footer (single footer,
      // no duplicate Hangar Talk one above).
      let globalUnsubToken: string | null = null;
      const { data: existingTok } = await supabase
        .from("email_unsubscribe_tokens")
        .select("token")
        .eq("email", recipient)
        .is("used_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existingTok?.token) {
        globalUnsubToken = existingTok.token as string;
      } else {
        const newTok = crypto.randomUUID();
        const { error: tokErr } = await supabase
          .from("email_unsubscribe_tokens")
          .insert({ email: recipient, token: newTok });
        if (!tokErr) globalUnsubToken = newTok;
      }
      if (!globalUnsubToken) {
        console.error(`Could not obtain unsubscribe token for ${recipient}; skipping.`);
        continue;
      }

      const messageId = crypto.randomUUID();
      const idempotencyKey = `ht-digest-${messageId}`;
      const subject = sections.length === 1
        ? `New activity on a thread you follow`
        : `New activity on ${sections.length} threads you follow`;

      const html = `
<div style="font-family:Arial,Helvetica,sans-serif;background:#ffffff;padding:0;margin:0;">
  <div style="max-width:600px;margin:0 auto;padding:24px 20px;">
    <div style="background:#1e3a5f;color:#ffffff;padding:18px 20px;border-radius:8px 8px 0 0;">
      <div style="font-size:18px;font-weight:700;">EAA Chapter 84 Connect</div>
      <div style="font-size:13px;opacity:0.85;margin-top:2px;">Hangar Talk — daily digest</div>
    </div>
    <div style="background:#f4f6f8;padding:16px;border-radius:0 0 8px 8px;">
      ${sections.join("\n")}
    </div>
    <div style="margin-top:18px;font-size:12px;color:#6b7280;text-align:center;line-height:1.6;">
      You're receiving this because you subscribed to one or more Hangar Talk threads.
    </div>
  </div>
</div>`.trim();

      const text = textSections.join("\n---\n") +
        `\n\nYou're receiving this because you subscribed to one or more Hangar Talk threads.\n`;

      const { error: enqueueError } = await supabase.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload: {
          to: recipient,
          from: FROM_ADDR,
          sender_domain: SENDER_DOMAIN,
          subject,
          html,
          text,
          purpose: "transactional",
          label: "hangar_talk_digest",
          idempotency_key: idempotencyKey,
          unsubscribe_token: globalUnsubToken,
          message_id: messageId,
          queued_at: new Date().toISOString(),
        },
      });

      if (enqueueError) {
        console.error(`Failed to enqueue digest for ${recipient}:`, enqueueError.message);
        continue;
      }

      // Mark these subscriptions as notified.
      await supabase
        .from("hangar_talk_subscriptions")
        .update({ last_notified_at: nowIso })
        .in("id", subIdsToTouch);

      recipientsEmailed++;
      console.log(`Enqueued Hangar Talk digest for ${recipient} (${subIdsToTouch.length} threads)`);
    }

    return new Response(
      JSON.stringify({ success: true, recipientsEmailed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("hangar-talk-digest error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
