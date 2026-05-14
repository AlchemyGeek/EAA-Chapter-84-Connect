UPDATE public.buddy_email_templates SET body =
'Hello [NewMemberName] and [BuddyName],

I''d like to introduce you to each other as part of our chapter''s Buddy Program.

[BuddyName] has volunteered to be available as a resource as you get more familiar with the chapter. This is a flexible and informal connection — the goal is simply to help make it easier to get started, ask questions, and feel comfortable participating.

[NewMemberName], feel free to reach out with any questions, whether it''s about meetings, events, volunteering, or getting involved in specific areas.

[BuddyName], thank you for being available to:

- Answer questions as they come up
- Connect at a monthly meeting if possible
- Help make introductions and point to useful resources

There are no strict expectations — even a quick introduction and occasional check-in can make a big difference.

You can coordinate directly using whatever communication method works best for both of you.

Contact information:
  • [NewMemberName] (new member): [NewMemberEmail]
  • [BuddyName] (buddy): [BuddyEmail]

If any questions come up, I''m always happy to help.

Best regards,
Stathis
Membership Coordinator
EAA Chapter 84',
updated_at = now()
WHERE template_key = 'intro';

UPDATE public.buddy_email_templates SET body =
'Hello [NewMemberName] and [BuddyName],

It''s been a few months since you were connected through the Buddy Program, and I wanted to check in.

I hope you''ve had a chance to connect and that the experience has been helpful. There''s no formal requirement for ongoing involvement — the goal is simply to support a smooth introduction to the chapter.

If either of you need anything, or if there''s a way I can help (including reconnecting, answering questions, or pairing with someone new), please let me know.

For convenience, here is each other''s contact info:
  • [NewMemberName] (new member): [NewMemberEmail]
  • [BuddyName] (buddy): [BuddyEmail]

Thank you both for participating and supporting the chapter community.

Best regards,
Stathis
Membership Coordinator
EAA Chapter 84',
updated_at = now()
WHERE template_key = 'check_in';