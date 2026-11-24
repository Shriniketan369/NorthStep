# NorthStep: the 33 cases

**Fixed** = done in index.html and tested in a real browser.
**N/A** = the app has no such feature yet; the rule is written down for when it does.
**Backend** = a web page cannot enforce this alone. It needs the Supabase server.

| # | Case | Status | What happens / what the server must do |
|---|------|--------|----------------------------------------|
| 1 | Script in username | Fixed | Names are cleaned, capped at 40 characters, and always shown as plain text. Tested with `<img onerror>`. |
| 2 | Change the ID in the URL | Fixed (here) / Backend | A wrong report ID shows "couldn't find that report". Reports are only on your device. On Supabase: row-level security so a user can only read rows where `user_id = auth.uid()`. |
| 3 | Type /admin | Fixed (here) / Backend | Unknown addresses go to Today. The old `#founder` view is removed. `404.html` added. Any real admin page must check the user's role on the server. |
| 4 | API key in browser | Fixed (here) / Backend | No keys in the file. Only the Supabase **anon** key may ever go in the browser. The `service_role` key stays on the server. |
| 5 | Prompt-inject AI | N/A | No AI call yet. When added: call the model from a server function, never send secrets in the prompt, treat typed text as data, limit length. |
| 6 | Admin at signup | Fixed (here) / Backend | Sign-up only saves name and email. Roles must live in a server table that users cannot write to. |
| 7 | Edit the price | Backend | The price on screen is display only. The real price is set in the payment provider. |
| 8 | Fake a payment | Fixed (here) / Backend | The browser can no longer show "Payment confirmed" (edited storage is ignored). Confirmation must come from the payment provider's webhook, checked on the server. |
| 9 | Redeem it 100 times | Fixed (here) / Backend | One pre-pay entry per email on the device. Server: unique constraint on email and on each code, single-use check inside the database. |
| 10 | Order -1 items | Fixed (here) / Backend | All numbers are clamped (hours 2 to 40 and so on), even if storage is edited. Server: check quantity > 0 in the database. |
| 11 | Guess the login code | Backend | Here: sign-in locks for 30 seconds and longer after 5 wrong tries (a browser can bypass this). Server: Supabase Auth rate limits and short-lived one-time codes. |
| 12 | Query the database | Backend | There is no database yet. With Supabase: turn on row-level security on every table, no "allow all" policies. |
| 13 | .env in Git | Fixed | `.gitignore` added. Before the first commit, run `git status` and check no `.env` is listed. If one was ever committed, rotate the keys. |
| 14 | Upload a non-photo | N/A | No uploads yet. When added: check type and size on the server, not just the file name. |
| 15 | Back at checkout | Fixed | The Back button now goes one step back (Pay step 2 to step 1) and double clicks make one entry only. |
| 16 | Emoji username | Fixed | The avatar letter is the whole emoji. Tested. |
| 17 | 5,000 word bio | Fixed | There is no bio field. Every text box has a limit, and long text wraps. |
| 18 | Airplane mode upload | Fixed (here) | Offline banner. Pre-pay entries wait in an outbox and send when back online. No uploads exist yet. |
| 19 | Rotate the phone | Fixed | Tested portrait, landscape and a 320 px screen. Nothing scrolls sideways. |
| 20 | Huge text | Fixed | Text now follows the device text size. Settings has Default / Large / Larger. Tested at the largest. |
| 21 | Dark mode | Fixed | Follows the phone's setting on first visit. The logo changes colour with the theme. |
| 22 | Sign up twice | Fixed (here) / Backend | "There's already an account with this email." Server: unique email in Auth. |
| 23 | Blank email | Fixed | Clear message. Tested. |
| 24 | Space password | Fixed | Only spaces is refused, 8 characters minimum, and a Show button. Tested. |
| 25 | iPhone Duo | Fixed (guess) | I read this as small or foldable screens. The page respects the notch and home bar, and inputs avoid the iPhone zoom. **If you meant two-step login (Duo), tell me. That is a server feature.** |
| 26 | Deny permissions | Fixed | The app asks for no camera, location or notifications. If copy is blocked it says "Unavailable". |
| 27 | Hide email | Fixed | Relay addresses and `+` addresses are accepted. The app never builds a name from the email. |
| 28 | Quit onboarding | Fixed | The roadmap and niche questions save as you go. Coming back shows Resume or Start over. |
| 29 | New time zone | Fixed (here) | Times are stored in UTC and shown in local time. "This week" resets each Monday. |
| 30 | Arabic language switching | Partly | Layout holds up in right-to-left, and Arabic names and text display correctly. The words on screen are still English. A real Arabic version needs a human translator. |
| 31 | Slow data | Fixed | Fonts load without blocking. Sends have an 8 second timeout and retry later. Buttons ignore a second tap. |
| 32 | Delete, sign up again | Fixed | Settings has "Delete my account and data". After that, signing up with the same email works fresh. Server: delete the Auth user and all their rows. |
| 33 | Login from two phones | Backend | Two phones have separate data until accounts and sync exist. Plan: allow both sessions, last save wins, show "updated on another device". Two tabs in one browser already stay in step. |

## Honest limits of this file
- Accounts here live in the browser on one device. Passwords are salted and hashed, but anyone who controls the device can still edit storage.
- Items marked Backend are not safe until the Supabase work is done. Do not take real money before that.
- Reports saved by the old version stay on the device but won't appear under new accounts.
