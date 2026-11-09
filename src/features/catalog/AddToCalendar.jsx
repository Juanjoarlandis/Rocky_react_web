import { calendarDrop, googleCalendarUrl, hasLaunchDate } from '../../../shared/drop-calendar.mjs';
import { dropCalendarUrl } from '../../api/drops.js';
import { fechaLarga, horaDeMadrid } from '../drops/fecha.js';
import '../../styles/components/add-to-calendar.css';

/* Apúntate la fecha: el .ics sirve para Apple, Outlook y casi cualquier
   calendario (con aviso un día y una hora antes) y Google tiene su enlace.
   Recibe un drop público (shared/drops.mjs); sin fecha no enseña nada. */
export default function AddToCalendar({ drop }) {
  if (!drop || !hasLaunchDate(drop)) return null;
  const event = calendarDrop(drop);
  const google = googleCalendarUrl(event, { origin: window.location.origin });

  return (
    <div className="calendario">
      <p className="calendario-cuando">
        Sale el{' '}
        <b>
          {fechaLarga(drop.launchAt)} a las {horaDeMadrid(drop.launchAt)}
        </b>{' '}
        (hora de Madrid).
      </p>
      <div className="calendario-botones">
        <a className="btn btn--ghost btn--sm" href={dropCalendarUrl(drop.handle)} download>
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
