export const COMPLETE_MEMBERSHIP_HTML = String.raw`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Complete Your EAA Chapter 84 Membership</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f9; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9; padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="background-color:#0B1F3A; padding:28px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="color:#ffffff; font-size:20px; font-weight:bold; letter-spacing:0.5px;">EAA Chapter 84</span><br>
                    <span style="color:#9FB3D1; font-size:13px;">Harvey Field &middot; Snohomish, WA</span>
                  </td>
                  <td align="right">
                    <span style="display:inline-block; background-color:#1E3A6E; color:#ffffff; font-size:12px; padding:6px 14px; border-radius:999px; font-weight:bold;">New to the Pattern</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 32px 24px 32px;">
              <p style="font-size:16px; color:#1a1a1a; line-height:1.6; margin-top:0;">
                Hi {{first_name}},
              </p>
              <p style="font-size:16px; color:#1a1a1a; line-height:1.6;">
                Great news — we received your application to join EAA Chapter 84, and we're excited to have you enter the pattern! There's just one more step before you're cleared for landing: your <strong>{{dues_amount}} annual dues</strong> are still outstanding, which means your membership isn't quite complete yet.
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F0F4FA; border-left:4px solid #0B1F3A; border-radius:6px; margin:24px 0;">
                <tr>
                  <td style="padding:16px 20px;">
                    <span style="font-size:14px; color:#0B1F3A; font-weight:bold;">Almost there!</span><br>
                    <span style="font-size:14px; color:#333333; line-height:1.5;">Your application is on file, but dues payment is what finalizes your membership. Once that's squared away, you're officially part of the chapter.</span>
                  </td>
                </tr>
              </table>

              <p style="font-size:16px; color:#1a1a1a; line-height:1.6;">
                Here's what's waiting for you on the other side:
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:8px 0; font-size:15px; color:#1a1a1a; line-height:1.5;">
                    <span style="display:inline-block; width:8px; height:8px; background-color:#0B1F3A; border-radius:50%; margin-right:10px;"></span>
                    A hangar full of builders, pilots, and mentors ready to help
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0; font-size:15px; color:#1a1a1a; line-height:1.5;">
                    <span style="display:inline-block; width:8px; height:8px; background-color:#0B1F3A; border-radius:50%; margin-right:10px;"></span>
                    Young Eagles, fly-ins, and monthly chapter meetings
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0; font-size:15px; color:#1a1a1a; line-height:1.5;">
                    <span style="display:inline-block; width:8px; height:8px; background-color:#0B1F3A; border-radius:50%; margin-right:10px;"></span>
                    A New Member Buddy to help you find your bearings
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0; font-size:15px; color:#1a1a1a; line-height:1.5;">
                    <span style="display:inline-block; width:8px; height:8px; background-color:#0B1F3A; border-radius:50%; margin-right:10px;"></span>
                    Access to Chapter Connect — classifieds, Hangar Talk, and more
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0 8px 0;">
                <tr>
                  <td align="center">
                    <a href="https://eaa84connect.lovable.app/join" style="display:inline-block; background-color:#0B1F3A; color:#ffffff; font-size:16px; font-weight:bold; text-decoration:none; padding:14px 36px; border-radius:999px;">
                      Complete My Membership
                    </a>
                  </td>
                </tr>
              </table>
              <p style="font-size:13px; color:#888888; text-align:center; margin-top:4px;">
                Takes less than 2 minutes — pay your {{dues_amount}} dues and you're all set.
              </p>

              <p style="font-size:16px; color:#1a1a1a; line-height:1.6; margin-top:28px;">
                We'd love to keep you in the pattern. If you have any questions or run into any trouble with payment, just reply to this email — we're happy to help.
              </p>

              <p style="font-size:16px; color:#1a1a1a; line-height:1.6;">
                Blue skies,<br>
                <strong>EAA Chapter 84 Membership Team</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#F4F6F9; padding:20px 32px; text-align:center;">
              <p style="font-size:12px; color:#999999; margin:0;">
                EAA Chapter 84 &middot; Harvey Field (S43), Snohomish, WA
              </p>
              <p style="font-size:12px; color:#999999; margin:4px 0 0 0;">
                Questions? Reply to this email or reach us at membership@eaa84.org
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
