export function wasRemovedFromClassroom(
  status: string | null | undefined
): boolean {
  return status !== "active";
}

export function isInviteEmailSendFailure(
  errorMessage: string | null | undefined
): boolean {
  const text = (errorMessage ?? "").toLowerCase();
  return (
    text.includes("sending magic link") ||
    text.includes("sending email") ||
    text.includes("error sending")
  );
}

export function inviteOtpErrorMessage(
  errorMessage: string | null | undefined
): string {
  const text = (errorMessage ?? "").toLowerCase();
  if (
    text.includes("after") ||
    text.includes("seconds") ||
    text.includes("rate") ||
    text.includes("security purposes")
  ) {
    return "El email no salió. Hay que esperar un minuto entre códigos. Vuelve a invitar en un momento.";
  }
  if (isInviteEmailSendFailure(errorMessage)) {
    return "El email no salió. Zoho está rechazando el envío. Que pidan el código en /login.";
  }
  return "El email no salió. Espera un minuto y vuelve a invitar, o que entren por /login.";
}
