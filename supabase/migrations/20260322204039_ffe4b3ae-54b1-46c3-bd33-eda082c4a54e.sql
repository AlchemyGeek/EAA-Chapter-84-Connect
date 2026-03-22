
-- Buddy email templates table
CREATE TABLE public.buddy_email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text UNIQUE NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.buddy_email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view templates"
  ON public.buddy_email_templates FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage templates"
  ON public.buddy_email_templates FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Buddy email log table
CREATE TABLE public.buddy_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.buddy_assignments(id) ON DELETE CASCADE,
  email_type text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.buddy_email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Officers and admins can view email log"
  ON public.buddy_email_log FOR SELECT
  TO authenticated
  USING (
    (EXISTS (
      SELECT 1 FROM chapter_leadership cl
      JOIN roster_members rm ON rm.key_id = cl.key_id
      WHERE rm.email = (auth.jwt() ->> 'email'::text)
    )) OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Officers and admins can insert email log"
  ON public.buddy_email_log FOR INSERT
  TO authenticated
  WITH CHECK (
    (EXISTS (
      SELECT 1 FROM chapter_leadership cl
      JOIN roster_members rm ON rm.key_id = cl.key_id
      WHERE rm.email = (auth.jwt() ->> 'email'::text)
    )) OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Seed default templates
INSERT INTO public.buddy_email_templates (template_key, subject, body) VALUES
('intro', 'Welcome to EAA Chapter 84 – Meet Your Buddy!',
'Hi [NewMemberName],

Welcome to EAA Chapter 84! We''re excited to have you as a member.

We''ve paired you with [BuddyName], an experienced chapter member who will be your buddy during your first few months. [BuddyName] can help you get oriented, answer questions about chapter activities, and introduce you to other members.

Feel free to reach out and say hello!

Best regards,
EAA Chapter 84 Membership Team'),
('reminder', 'Reminder: Connect with Your EAA Chapter 84 Buddy',
'Hi [NewMemberName],

Just a friendly reminder that [BuddyName] is your chapter buddy and is here to help you get the most out of your EAA Chapter 84 membership.

If you haven''t connected yet, now is a great time to reach out! [BuddyName] can tell you about upcoming events, introduce you to members with similar aviation interests, and answer any questions you might have.

Best regards,
EAA Chapter 84 Membership Team');
