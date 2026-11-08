import { CURRENT_DROP } from '../../config/campaign.js';
import { googleCalendarUrl, hasLaunchDate } from '../../../shared/drop-calendar.mjs';
import '../../styles/components/add-to-calendar.css';

/* Apúntate la fecha: el .ics sirve para Apple, Outlook y casi cualquier
   calendario (con aviso un día y una hora antes) y Google tiene su enlace.
   Sin fecha en la campaña, no se enseña nada. */
export default function AddToCalendar({ drop = CURRENT_DROP }) {
  if (!hasLaunchDate(drop)) return null;
  const when = new Date(drop.launchAt).toLocaleString('es-ES', {
    timeZone: 'Europe/Madrid',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
  const google = googleCalendarUrl(drop, { origin: window.location.origin });

  return (
    <div className="calendario">
      <p className="calendario-cuando">
        Sale el <b>{when}</b>.
      </p>
      <div className="calendario-botones">
        <a className="btn btn--ghost btn--sm" href="/api/drop/calendario.ics" download>
          Añadir al calendario
        </a>
        <a
          className="btn btn--ghost btn--sm"
          href={google}
          target="_blank"
          rel="noopener noreferrer"
        >
          Google Calendar
        </a>
      </div>
    </div>
  );
}
