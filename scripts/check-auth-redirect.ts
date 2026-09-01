// Prints where a production magic link would send the user.
// Does not print the full token URL.
//
//   npx tsx scripts/check-auth-redirect.ts
//
// Uses generateLink for the teacher email. Supabase may also send that email.

import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { createAdminClient } from "../src/lib/supabase/admin";

const email = (process.env.TEACHER_EMAILS ?? "profe@profekyle.com")
  .split(",")[0]
  ?.trim()
  .toLowerCase();

async function main() {
  if (!email) {
    console.error("No teacher email in TEACHER_EMAILS");
    process.exit(1);
  }

  const redirectTo = "https://learn.profekyle.com/auth/confirm?next=/dashboard";
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo },
  });

  if (error) {
    console.error("generateLink failed:", error.message);
    process.exit(1);
  }

  const actionLink = data.properties.action_link;
  const actionUrl = new URL(actionLink);
  const nestedRedirect =
    actionUrl.searchParams.get("redirect_to") ??
    actionUrl.searchParams.get("redirectTo");

  console.log("email:", email);
  console.log("requested redirectTo:", redirectTo);
  console.log("action_link host:", actionUrl.host);
  console.log("action_link path:", actionUrl.pathname);
  console.log("nested redirect_to:", nestedRedirect ?? "(none)");

  const target = nestedRedirect ?? actionLink;
  if (target.includes("learn.profekyle.com/auth/confirm")) {
    console.log("ok: magic link points at production confirm page");
  } else if (target.includes("learn.profekyle.com/auth/callback")) {
    console.log("ok: magic link still points at /auth/callback (legacy PKCE)");
  } else if (target.includes("localhost")) {
    console.error(
      "fail: magic link still points at localhost. Set Supabase Site URL to https://learn.profekyle.com and add https://learn.profekyle.com/auth/confirm to Redirect URLs."
    );
    process.exit(1);
  } else {
    console.error("warn: unexpected redirect", target.slice(0, 120));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
