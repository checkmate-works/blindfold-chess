# Cookie Consent Banner Setup Guide

This guide explains how to set up the CookieYes cookie consent banner for GDPR/CCPA compliance.

## Why is this required?

- **GDPR Compliance**: Required by law for EU/UK users
- **CCPA Compliance**: Required for California users
- **Google Consent Mode v2**: Automatically integrated with CookieYes

## What is CookieYes?

CookieYes is a Google-certified Consent Management Platform (CMP) that:

- Displays cookie consent banners
- Integrates with Google Consent Mode v2
- Supports IAB TCF 2.2 framework
- Provides multi-language support (English, Japanese, and 40+ languages)
- Offers a free plan for up to 25,000 page views/month

## Setup Instructions

### 1. Create a CookieYes Account

1. Go to [https://www.cookieyes.com/](https://www.cookieyes.com/)
2. Click "Sign Up Free" (no credit card required)
3. Enter your email and create a password
4. Verify your email address

### 2. Add Your Website

1. After logging in, click "Add Website"
2. Enter your website URL: `https://www.blindfold-chess.online`
3. Select your **default website language**: **English**
4. Choose your plan: **Free** (up to 25,000 PV/month)
5. Click "Continue"

> **Note on Multi-language**: CookieYes will automatically detect the page language from the `<html lang="xx">` attribute. Since your site already uses Next.js i18n with English and Japanese, the banner will automatically adapt to each page's language.

### 3. Configure Cookie Banner

1. **Select Cookie Categories**:
   - ✅ Necessary (Always enabled)
   - ✅ Analytics (Google Analytics)
   - ⬜ Advertisement (if you run third party ads)
   - ⬜ Functional (if you add features like video embeds)

2. **Cookie Scanner** (Automatic):
   - CookieYes will automatically scan your website
   - It will detect Google Analytics and other cookies
   - Review and approve the detected cookies

3. **Customize Banner Design** (Optional):
   - Choose banner position (Bottom, Top, Center)
   - Select a theme color to match your brand
   - Preview the banner on desktop and mobile

4. **Configure Google Consent Mode v2**:
   - Go to "Settings" → "Integrations" → "Google Consent Mode"
   - Enable "Google Consent Mode v2"
   - Select "Advanced Implementation"
   - This allows Google to use cookieless pings for conversion modeling

5. **Set Up Geolocation Targeting** (Optional):
   - Go to "Settings" → "Geolocation"
   - Enable "Show banner only in specific regions"
   - Select: EEA, UK, California, Brazil (LGPD), etc.
   - Or keep default: "Show to all visitors"

### 4. Get Your CookieYes ID

1. Go to "Settings" → "Install on Website"
2. Select "Manual Installation"
3. You'll see code like this:
   ```html
   <script
     id="cookieyes"
     type="text/javascript"
     src="https://cdn-cookieyes.com/client_data/YOUR-ID-HERE/script.js"
   ></script>
   ```
4. Copy the ID from the URL (format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

### 5. Add to Environment Variables

1. Create or edit `.env.local` in your project root:

   ```bash
   NEXT_PUBLIC_COOKIEYES_ID=your-cookieyes-id-here
   ```

2. For production (Vercel):
   - Go to your Vercel project settings
   - Navigate to "Environment Variables"
   - Add: `NEXT_PUBLIC_COOKIEYES_ID` with your CookieYes ID
   - Redeploy your application

### 6. Test the Implementation

1. **Local Testing**:

   ```bash
   pnpm dev
   ```

   - Open your browser
   - The cookie banner should appear at the bottom
   - Try accepting/rejecting cookies
   - Check that Google Analytics only loads after consent

2. **Clear Browser Data**:
   - Open DevTools (F12)
   - Go to Application → Storage → Clear site data
   - Reload the page to see the banner again

3. **Test Consent Mode**:
   - Open DevTools → Console
   - Type: `window.dataLayer`
   - You should see consent state updates

4. **Test on Production**:
   - Deploy to Vercel/production
   - Visit your website
   - Verify the banner appears and functions correctly
   - Test from different regions (use VPN if needed)

### 7. Privacy Policy

- Update your Privacy Policy to mention cookie usage
- CookieYes provides a cookie policy generator
- Go to "Settings" → "Cookie Policy" → "Generate Policy"
- Add the policy to your website's footer

## Troubleshooting

### Banner Not Appearing

1. **Check Environment Variable**:

   ```bash
   # Verify the variable is set
   echo $NEXT_PUBLIC_COOKIEYES_ID
   ```

2. **Clear Browser Cache**:
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Or open in incognito mode

3. **Check Browser Console**:
   - Open DevTools → Console
   - Look for CookieYes script errors
   - Verify the script is loading from CDN

### Banner Shows But Doesn't Work

1. **Verify CookieYes ID**:
   - Check that the ID matches your dashboard
   - Ensure no extra spaces or quotes in `.env.local`

2. **Check Script Blocking**:
   - Disable ad blockers temporarily
   - Some ad blockers block CMP scripts

### Google Analytics Not Blocked

1. **Check Consent Mode Integration**:
   - Go to CookieYes Dashboard → Integrations
   - Verify Google Consent Mode v2 is enabled
   - Use "Advanced Implementation"

2. **Verify gtag Configuration**:
   - CookieYes should auto-configure `gtag.js`
   - Check Network tab in DevTools
   - GA requests should wait for consent

## Additional Features

### Multi-Language Support (English + Japanese)

**How it works automatically:**

- Your Next.js site already sets `<html lang="en">` or `<html lang="ja">` based on the URL
- CookieYes automatically detects this and displays the banner in the matching language
- No additional configuration needed for basic functionality

**To customize banner text for Japanese:**

1. **In CookieYes Dashboard**:
   - Go to "Settings" → "Languages"
   - Click "Add Language"
   - Select "Japanese (日本語)"

2. **Customize Japanese Text**:

   ```
   Banner Title: クッキーの使用について
   Banner Description: 当サイトでは、ユーザー体験の向上と広告配信のためにクッキーを使用しています。
   Accept Button: すべて同意
   Reject Button: すべて拒否
   Settings Button: 設定
   ```

3. **Cookie Categories in Japanese**:
   - Necessary: 必須Cookie
   - Analytics: 分析Cookie
   - Advertisement: 広告Cookie

4. **Test the Implementation**:
   - Visit `https://www.blindfold-chess.online/en` → Banner shows in English
   - Visit `https://www.blindfold-chess.online/ja` → Banner shows in Japanese
   - The language switches automatically based on the page URL

**Important Notes:**

- ✅ **Free Plan**: Language detection from HTML `lang` attribute works on free plan
- ✅ **Automatic Switching**: Works seamlessly with Next.js i18n routing
- ❌ **Auto-Translation**: Automatic AI translation requires paid plan ($10/month)
- ✅ **Manual Translation**: You can manually set text for each language on free plan

**Fallback Behavior:**

- If Japanese translation is not configured, it will show English (default language)
- Configure both languages in CookieYes dashboard for full multi-language support

### Cookie Preferences Button

Add a "Cookie Settings" link to your footer:

```tsx
// In your Footer component
<button
  onClick={() => {
    // @ts-ignore
    if (window.CookieYes) {
      // @ts-ignore
      window.CookieYes.show();
    }
  }}
>
  Cookie Settings
</button>
```

### A/B Testing Banner Designs

CookieYes allows A/B testing different:

- Banner positions
- Button texts
- Color schemes

To optimize consent rates, test different designs in the dashboard.

## Compliance Best Practices

1. **Don't Block the Banner**: Never hide or manipulate the CMP banner
2. **Allow Easy Withdrawal**: Users must be able to change preferences anytime
3. **No Pre-Checked Boxes**: Non-essential cookies must be opt-in
4. **Clear Language**: Use simple, understandable text
5. **Keep Records**: CookieYes automatically logs all consent actions

## Pricing

- **Free Plan**: Up to 25,000 page views/month
- **Pro Plan**: Up to 100,000 page views/month ($10/month)
- **Business Plan**: Up to 500,000 page views/month ($25/month)

For most small-to-medium websites, the free plan is sufficient.

## Resources

- [CookieYes Documentation](https://www.cookieyes.com/documentation/)
- [Google Consent Mode v2 Guide](https://www.cookieyes.com/documentation/cookie-banner/google-consent-mode-v2/)
- [GDPR Compliance Checklist](https://www.cookieyes.com/gdpr-cookie-consent/)
- [CookieYes Support](https://www.cookieyes.com/support/)

## Support

If you encounter issues:

1. Check [CookieYes Help Center](https://www.cookieyes.com/support/)
2. Contact CookieYes Support (email in dashboard)
3. Review this project's GitHub issues

---

**Last Updated**: 2025-01-27
**CookieYes Version**: Latest (auto-updated from CDN)
