import { AppError } from "@/lib/errors";
import { workshopConfig } from "./config";
import { levelTag, type WorkshopLevelId } from "./levels";

const API = "https://connect.mailerlite.com/api";

type Group = { id: string; name: string };

export type WorkshopLead = {
  name: string;
  email: string;
  level: WorkshopLevelId;
};

type Deps = {
  fetch: typeof fetch;
  token: string;
};

function headers(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Version": "2026-10-12",
  };
}

async function readJson(response: Response): Promise<{ data?: Group[] | Group }> {
  try {
    return (await response.json()) as { data?: Group[] | Group };
  } catch (error) {
    console.error("MailerLite response was not JSON", {
      status: response.status,
      message: error instanceof Error ? error.message : "unknown",
    });
    throw new AppError(
      "No pude guardar tu cupo. Intenta de nuevo.",
      "MAILERLITE_RESPONSE",
      502,
    );
  }
}

async function ensureGroup(name: string, deps: Deps): Promise<string> {
  const url = new URL(`${API}/groups`);
  url.searchParams.set("filter[name]", name);
  url.searchParams.set("limit", "100");
  const listed = await deps.fetch(url, { headers: headers(deps.token) });
  if (!listed.ok) {
    console.error("MailerLite group lookup failed", { status: listed.status, name });
    throw new AppError(
      "No pude guardar tu cupo. Intenta de nuevo.",
      "MAILERLITE_GROUP",
      502,
    );
  }
  const body = await readJson(listed);
  const groups = Array.isArray(body.data) ? body.data : [];
  const exact = groups.find((group) => group.name === name);
  if (exact) return exact.id;

  const created = await deps.fetch(`${API}/groups`, {
    method: "POST",
    headers: headers(deps.token),
    body: JSON.stringify({ name }),
  });
  if (created.status !== 201) {
    console.error("MailerLite group create failed", { status: created.status, name });
    throw new AppError(
      "No pude guardar tu cupo. Intenta de nuevo.",
      "MAILERLITE_GROUP_CREATE",
      502,
    );
  }
  const createdBody = await readJson(created);
  const group = createdBody.data;
  if (!group || Array.isArray(group) || !group.id) {
    throw new AppError(
      "No pude guardar tu cupo. Intenta de nuevo.",
      "MAILERLITE_GROUP_CREATE",
      502,
    );
  }
  return group.id;
}

export async function registerWorkshopLead(lead: WorkshopLead, deps: Deps): Promise<void> {
  const groupNames = [
    workshopConfig.mailerLiteGroup,
    workshopConfig.sourceTag,
    levelTag(lead.level),
  ];
  const groupIds = await Promise.all(groupNames.map((name) => ensureGroup(name, deps)));
  const response = await deps.fetch(`${API}/subscribers`, {
    method: "POST",
    headers: headers(deps.token),
    body: JSON.stringify({
      email: lead.email,
      fields: { name: lead.name },
      groups: groupIds,
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
