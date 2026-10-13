import { workshopConfig } from "./config";

const MEXICO_CITY_OFFSET_HOURS = 6;

function formatUtc(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

/** 28 Oct 2026, 17:30 America/Mexico_City, 45 minutes. Mexico City is UTC-6. */
export function workshopInstants() {
  const start = new Date(Date.UTC(2026, 9, 28, 17 + MEXICO_CITY_OFFSET_HOURS, 30, 0));
  const end = new Date(start.getTime() + 45 * 60 * 1000);
  return {
    start,
    end,
    startStamp: formatUtc(start),
    endStamp: formatUtc(end),
  };
}

export function googleCalendarUrl(): string {
  const { startStamp, endStamp } = workshopInstants();
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: workshopConfig.workshopName,
    dates: `${startStamp}/${endStamp}`,
    details: "Zoom. El enlace llega en el grupo de WhatsApp.",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function workshopIcs(): string {
  const { startStamp, endStamp } = workshopInstants();
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Profe Kyle//Taller//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `DTSTART:${startStamp}`,
    `DTEND:${endStamp}`,
    `SUMMARY:${workshopConfig.workshopName}`,
    "DESCRIPTION:Zoom. El enlace llega en el grupo de WhatsApp.",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
