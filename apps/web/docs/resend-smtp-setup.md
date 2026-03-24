# Resend SMTP Setup (Supabase Auth)

This guide covers configuring [Resend](https://resend.com/) as the custom SMTP provider for Supabase Auth in production. Once configured, all authentication emails (signup confirmation, password reset, email change) are sent through Resend instead of Supabase's built-in email service.

> **Note:** This guide is for **production** (Supabase Dashboard) configuration only. For local development, Supabase uses [Inbucket](http://127.0.0.1:54324) to capture emails — no SMTP setup is needed.

## Prerequisites

- A [Resend](https://resend.com/) account
- A verified domain in Resend (required to send emails from your own domain)
- Access to your domain's DNS settings (for SPF, DKIM, DMARC records)
- Access to the [Supabase Dashboard](https://supabase.com/dashboard) for your project

## 1. Verify Your Domain in Resend

> **⚠️ Domain verification is mandatory.** You must verify your domain at [resend.com/domains](https://resend.com/domains) **before** Supabase Auth can send any emails through Resend. Without a verified domain, all authentication emails (signup confirmation, password reset, email change) will fail with **500 errors**. Do not skip this step.

Resend's dashboard walks you through the required DNS records (SPF, DKIM, DMARC). Follow the on-screen instructions to add them in your DNS provider (e.g., Cloudflare, Route 53, Vercel Domains) and click **Verify** in Resend. DNS propagation may take a few minutes to 48 hours.

> **Tip:** If you are already using Resend for the contact form (see [environment-variables.md](environment-variables.md#contact-form-email-optional)), your domain may already be verified. You can use the same domain for both the contact form API and SMTP.

## 2. Configure SMTP in Supabase Dashboard

Use the official [Resend integration for Supabase](https://supabase.com/partners/integrations/resend) to connect the two services. This automatically configures SMTP settings for your Supabase project.

1. Go to [resend.com/settings/integrations](https://resend.com/settings/integrations)
2. Find the **Supabase** integration and click **Install**
3. Follow the on-screen instructions to connect your Supabase project

> **Note:** The SMTP Password shown in Supabase Dashboard is actually your Resend API key (the `re_` prefixed string). After saving, the password field appears blank on page reload — this is a security feature of the Supabase Dashboard, not a bug. The value IS saved.

> **Tip:** For details on maximizing email deliverability, see the Resend blog post: [How to configure Supabase to send emails from your domain](https://resend.com/blog/how-to-configure-supabase-to-send-emails-from-your-domain).

## 3. Set Up Email Templates in Supabase Dashboard

The email templates defined in the local `config.toml` (under `[auth.email.template.*]`) and the HTML files in `supabase/templates/` are **only used for local development**. They do **not** automatically sync to the production Supabase project.

To use the same branded templates in production:

1. In Supabase Dashboard, go to **Authentication** > **Email** > **Templates** tab
2. For each template type, copy the HTML content from the corresponding local file:

   | Template type            | Local file                             | Subject line                                 |
   | ------------------------ | -------------------------------------- | -------------------------------------------- |
   | **Confirm signup**       | `supabase/templates/confirmation.html` | `Confirm your Shingan Chess account`         |
   | **Reset password**       | `supabase/templates/recovery.html`     | `Reset your Shingan Chess password`          |
   | **Change email address** | `supabase/templates/email_change.html` | `Confirm your email change on Shingan Chess` |

3. For each template:
   - Set the **Subject** to the value listed above
   - Replace the **Body** with the full HTML content from the local file
   - Ensure template variables (e.g., `{{ .ConfirmationURL }}`, `{{ .NewEmail }}`) are preserved exactly as-is
4. Click **Save** for each template

> **Important:** If you update the local template files in the future, remember to manually copy the changes to the Supabase Dashboard as well. There is no automatic synchronization.

## 4. Testing and Verification

After completing the setup:

1. **Test signup confirmation**: Create a new account using email/password on your production site. Check that the confirmation email arrives with the correct branding and subject line.

2. **Test password reset**: Use the "Forgot password" flow. Verify the reset email arrives and the `{{ .ConfirmationURL }}` link works correctly.

3. **Test email change**: Change your email address in the profile settings. Verify the confirmation email is sent to the new address.

4. **Check email deliverability**:
   - Verify emails are not landing in spam folders
   - Check the Resend dashboard ([resend.com/emails](https://resend.com/emails)) for delivery status and any bounce/complaint reports
   - Use [mail-tester.com](https://www.mail-tester.com/) to check your email score (SPF, DKIM, DMARC alignment)

5. **Monitor rate limits**: The Supabase `config.toml` sets `email_sent` in `[auth.rate_limit]` for local development. In production, rate limits are configured in the Supabase Dashboard under **Authentication** > **Rate Limits**. Ensure the production limit is appropriate for your expected traffic.

### Troubleshooting

| Issue                           | Possible cause                                    | Solution                                                |
| ------------------------------- | ------------------------------------------------- | ------------------------------------------------------- |
| Emails not arriving             | Sender domain not verified in Resend              | Check domain verification status at resend.com/domains  |
| Emails landing in spam          | Missing or incorrect DNS records (SPF/DKIM/DMARC) | Re-verify DNS records in Resend dashboard               |
| "Invalid sender" error          | Sender email domain doesn't match verified domain | Update sender email to use verified domain              |
| Template variables not rendered | Template variables modified or missing            | Ensure `{{ .ConfirmationURL }}` etc. are copied exactly |
