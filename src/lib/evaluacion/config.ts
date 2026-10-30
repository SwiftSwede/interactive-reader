export const evaluacionConfig = {
  /** "No sé nada" skips the quiz. Beginner courses migrate into the app over time. */
  beginnerRedirectUrl: "https://www.profekyle.com/curso-beginner-superpack/",
  /** [copy] Circle offer destination. Kyle confirms the URL. */
  circleOfferUrl: "https://www.profekyle.com/",
  cookieName: "pk_eval",
  cookieMaxAgeSeconds: 60 * 60 * 24 * 730,
  startsPerIpPerHour: 20,
} as const;

/** MailerLite tagging stays off until the funnel step is wired. */
export function mailerLiteEnabled(): boolean {
  return process.env.EVAL_MAILERLITE_ENABLED === "1";
}
