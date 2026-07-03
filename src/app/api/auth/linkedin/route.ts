import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * LinkedIn OAuth entry / callback (scaffold).
 * Real flow: redirect user to LinkedIn authorize URL, then exchange the
 * returned `code` for an access token and fetch the profile.
 * Requires LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET in .env.local.
 */
export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri =
    process.env.LINKEDIN_REDIRECT_URI || `${origin}/api/auth/linkedin`;

  if (!clientId) {
    // Send the user back to the app with a friendly flag instead of raw JSON.
    return NextResponse.redirect(`${origin}/career?linkedin=notconfigured`);
  }

  // Step 1 — no code yet: send the user to LinkedIn's consent screen.
  if (!code) {
    const scope = encodeURIComponent("openid profile email");
    const authUrl =
      `https://www.linkedin.com/oauth/v2/authorization?response_type=code` +
      `&client_id=${clientId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&scope=${scope}`;
    return NextResponse.redirect(authUrl);
  }

  // Step 2 — code present: exchange happens here (left as a scaffold).
  return NextResponse.redirect(`${origin}/career?linkedin=connected`);
}
