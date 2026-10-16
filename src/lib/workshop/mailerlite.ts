import { AppError } from "@/lib/errors";
import { levelTag, type WorkshopLevelId } from "./levels";

const API = "https://connect.mailerlite.com/api";

export type WorkshopLead = {
  name: string;
  email: string;
  level: WorkshopLevelId;
};

type Deps = {
  fetch: typeof fetch;
  token: string;
  groupId: string;
};

function headers(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Version": "2026-10-12",
  };
}

export async function registerWorkshopLead(lead: WorkshopLead, deps: Deps): Promise<void> {
  if (!deps.groupId) {
    throw new AppError(
      "La inscripción no está lista todavía. Intenta de nuevo en un rato.",
      "MAILERLITE_GROUP",
      503,
    );
  }

  const response = await deps.fetch(`${API}/subscribers`, {
    method: "POST",
    headers: headers(deps.token),
    body: JSON.stringify({
      email: lead.email,
      fields: {
        name: lead.name,
        english_level: levelTag(lead.level),
      },
      groups: [deps.groupId],
      status: "active",
    }),
  });
  if (response.status !== 200 && response.status !== 201) {
    console.error("MailerLite subscriber upsert failed", { status: response.status });
    throw new AppError(
      "No pude guardar tu cupo. Intenta de nuevo.",
      "MAILERLITE_SUBSCRIBE",
      502,
    );
  }
}
