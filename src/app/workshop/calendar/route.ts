import { workshopIcs } from "@/lib/workshop/calendar";

export function GET() {
  return new Response(workshopIcs(), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="taller-escucha.ics"',
    },
  });
}
