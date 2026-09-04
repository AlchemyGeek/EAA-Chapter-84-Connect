import { EmailAPIError, sendLovableEmail } from 'npm:@lovable.dev/email-js@0.1.0'

// Server-only: reads LOVABLE_API_KEY. Import from edge functions only — never
// expose sending to the browser.
//
// Direct-send counterpart to sendTemplateEmail() for feature senders that
// compose their own HTML at send time (per-send link rewriting, digests, etc.).
// Delivery, retries, suppression and unsubscribe are handled by Lovable.

export const SENDER_DOMAIN = 'notify.eaa84.org'

export type SendRawEmailResult =
  | { sent: true }
  | { sent: false; reason: 'recipient_suppressed' }

export interface SendRawEmailOptions {
  to: string
  from: string
  subject: string
  html: string
  text?: string
  label: string
  idempotencyKey: string
  replyTo?: string
  /** Supabase service-role client used to write the email_send_log row. */
  supabase?: any
  /** Value stored in email_send_log.template_name. Defaults to the label. */
  logTemplateName?: string
}

async function logSend(
  supabase: any,
  templateName: string,
  recipient: string,
  status: 'sent' | 'suppressed' | 'failed',
  errorMessage?: string,
) {
  if (!supabase) return
  const { error } = await supabase.from('email_send_log').insert({
    template_name: templateName,
    recipient_email: recipient,
    status,
    error_message: errorMessage ?? null,
  })
  if (error) {
    console.error('Failed to write email_send_log row:', error.message)
  }
}

export async function sendRawEmail(options: SendRawEmailOptions): Promise<SendRawEmailResult> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  if (!apiKey) {
    throw new Error('LOVABLE_API_KEY is not configured')
  }

  const templateName = options.logTemplateName ?? options.label

  try {
    await sendLovableEmail(
      {
        to: options.to,
        from: options.from,
        sender_domain: SENDER_DOMAIN,
        subject: options.subject,
        html: options.html,
        text: options.text,
        purpose: 'transactional',
        label: options.label,
        idempotency_key: options.idempotencyKey,
        reply_to: options.replyTo,
      },
      { apiKey, sendUrl: Deno.env.get('LOVABLE_SEND_URL') },
    )
  } catch (error) {
    if (error instanceof EmailAPIError && error.code === 'recipient_suppressed') {
      await logSend(options.supabase, templateName, options.to, 'suppressed')
      return { sent: false, reason: 'recipient_suppressed' }
    }
    const message = error instanceof Error ? error.message : String(error)
    await logSend(options.supabase, templateName, options.to, 'failed', message)
    throw error
  }

  await logSend(options.supabase, templateName, options.to, 'sent')
  return { sent: true }
}
