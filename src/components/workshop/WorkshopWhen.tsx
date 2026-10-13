import { CalendarDays, Clock } from "lucide-react";
import { workshopConfig } from "@/lib/workshop/config";

export function WorkshopWhen() {
  return (
    <div className="wk-when">
      <p className="wk-when-date">
        <CalendarDays aria-hidden />
        <span>{workshopConfig.date}</span>
      </p>
      <div className="wk-when-times">
        <Clock aria-hidden />
        <ul>
          {workshopConfig.times.map((zone) => (
            <li key={zone.place}>
              {zone.time} ({zone.place})
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
