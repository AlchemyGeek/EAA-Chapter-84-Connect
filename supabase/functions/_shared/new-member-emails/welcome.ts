export const WELCOME_HTML = String.raw`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Welcome to EAA Chapter 84</title>
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
                    <span style="display:inline-block; background-color:#2E7D32; color:#ffffff; font-size:12px; padding:6px 14px; border-radius:999px; font-weight:bold;">Cleared for Takeoff</span>
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
                Welcome aboard! Your membership with EAA Chapter 84 is officially complete — you're no longer just new to the pattern, you're <strong>in</strong> it. We're glad to have you.
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F0F7F0; border-left:4px solid #2E7D32; border-radius:6px; margin:24px 0;">
                <tr>
                  <td style="padding:16px 20px;">
                    <span style="font-size:14px; color:#1B4D1E; font-weight:bold;">You're all set.</span><br>
                    <span style="font-size:14px; color:#333333; line-height:1.5;">Your dues are paid and your membership is active. Next stop: Chapter84 Connect, your home base for everything chapter-related.</span>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 8px 0;">
                <tr>
                  <td align="center">
                    <a href="https://eaa84connect.lovable.app" style="display:inline-block; background-color:#0B1F3A; color:#ffffff; font-size:16px; font-weight:bold; text-decoration:none; padding:14px 36px; border-radius:999px;">
                      Go to Chapter84 Connect
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size:16px; color:#1a1a1a; line-height:1.6; margin-top:32px; margin-bottom:12px;">
                A quick flight plan for getting started:
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="top" style="padding:10px 0; width:32px;">
                    <span style="display:inline-block; width:24px; height:24px; background-color:#0B1F3A; color:#ffffff; font-size:13px; font-weight:bold; text-align:center; line-height:24px; border-radius:50%;">1</span>
                  </td>
                  <td valign="top" style="padding:10px 0; font-size:15px; color:#1a1a1a; line-height:1.5;">
                    <strong>Explore volunteer opportunities</strong> — sign up to help with events, Young Eagles, build assistance, or chapter operations.
                  </td>
                </tr>
                <tr>
                  <td valign="top" style="padding:10px 0; width:32px;">
                    <span style="display:inline-block; width:24px; height:24px; background-color:#0B1F3A; color:#ffffff; font-size:13px; font-weight:bold; text-align:center; line-height:24px; border-radius:50%;">2</span>
                  </td>
                  <td valign="top" style="padding:10px 0; font-size:15px; color:#1a1a1a; line-height:1.5;">
                    <strong>Say hello in Hangar Talk</strong> — ask a question, offer help, or just introduce yourself to the community.
                  </td>
                </tr>
                <tr>
                  <td valign="top" style="padding:10px 0; width:32px;">
                    <span style="display:inline-block; width:24px; height:24px; background-color:#0B1F3A; color:#ffffff; font-size:13px; font-weight:bold; text-align:center; line-height:24px; border-radius:50%;">3</span>
                  </td>
                  <td valign="top" style="padding:10px 0; font-size:15px; color:#1a1a1a; line-height:1.5;">
                    <strong>Browse the Classifieds</strong> — parts, tools, and projects members are buying, selling, or trading.
                  </td>
                </tr>
                <tr>
                  <td valign="top" style="padding:10px 0; width:32px;">
                    <span style="display:inline-block; width:24px; height:24px; background-color:#0B1F3A; color:#ffffff; font-size:13px; font-weight:bold; text-align:center; line-height:24px; border-radius:50%;">4</span>
                  </td>
                  <td valign="top" style="padding:10px 0; font-size:15px; color:#1a1a1a; line-height:1.5;">
                    <strong>Meet your New Member Buddy</strong> — they'll help you find your bearings around the chapter.
                  </td>
                </tr>
              </table>

              <p style="font-size:16px; color:#1a1a1a; line-height:1.6; margin-top:28px;">
                For chapter news, events, and general information, our website at <a href="https://eaa84.org" style="color:#0B1F3A; font-weight:bold;">eaa84.org</a> is always a good place to check in.
              </p>

              <p style="font-size:16px; color:#1a1a1a; line-height:1.6;">
                We're looking forward to seeing you at Harvey Field. If you have any questions along the way, just reply to this email — we're happy to help.
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
