-- Allow admins to insert messages on behalf of any member (impersonation)
CREATE POLICY "Admins can insert messages"
ON public.hangar_talk_messages
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to insert attachments on behalf of any member
CREATE POLICY "Admins can insert attachments"
ON public.hangar_talk_attachments
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to insert reactions on behalf of any member
CREATE POLICY "Admins can insert reactions"
ON public.hangar_talk_reactions
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete reactions (for impersonation toggle)
CREATE POLICY "Admins can delete reactions"
ON public.hangar_talk_reactions
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));