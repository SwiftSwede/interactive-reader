import { workshopConfig } from "@/lib/workshop/config";

type WorkshopLegalLinksProps = {
  variant: "form" | "footer";
};

export function WorkshopLegalLinks({ variant }: WorkshopLegalLinksProps) {
  if (variant === "form") {
    return (
      <p className="wk-legal">
        <a href={workshopConfig.privacyPolicyUrl}>Política de privacidad</a> en profekyle.com
        (cookies y medición de anuncios).
      </p>
    );
  }

  return (
    <nav className="wk-footer-legal" aria-label="Legal">
      <a href={workshopConfig.privacyPolicyUrl}>Política de privacidad</a>
      <a href={workshopConfig.termsOfServiceUrl}>Términos de servicio</a>
    </nav>
  );
}
