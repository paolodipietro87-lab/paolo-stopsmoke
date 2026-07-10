import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import {
  chiaveGiorno,
  etichettaGiorno,
  giornoPrecedente,
  giornoSuccessivo,
  sigaretteDelGiorno,
} from '../core/storico';
import { reportEconomico } from '../core/stats';
import { annullaFumata, fuma } from '../data/actions';
import { db } from '../data/db';
import { formattaEuro } from './format';
import { usePiano } from './usePiano';

function oraLocale(t: number): string {
  return new Date(t - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function Statistiche() {
  const v = usePiano();
  const acquisti = useLiveQuery(() => db.purchases.toArray(), []);
  const multe = useLiveQuery(() => db.penalties.toArray(), []);
  const [retroattiva, setRetroattiva] = useState(() => oraLocale(Date.now()));
  const oggi = chiaveGiorno(Date.now());
  const [giornoMostrato, setGiornoMostrato] = useState(oggi);

  if (v.caricamento || !v.cfg || !v.stato || !acquisti || !multe) return null;

  const report = reportEconomico({ acquisti, multe, risparmio: v.risparmioEuro });
  const perGiorno = new Map<number, { fumate: number; sgarri: number }>();
  for (const s of v.stato.sigarette) {
    const g = perGiorno.get(s.giorno) ?? { fumate: 0, sgarri: 0 };
    g.fumate++;
    if (s.sgarro) g.sgarri++;
    perGiorno.set(s.giorno, g);
  }

  async function aggiungiRetroattiva() {
    await fuma(new Date(retroattiva).getTime(), v.cfg!);
  }

  const delGiorno = sigaretteDelGiorno(v.stato.sigarette, giornoMostrato);
  const riepilogo =
    delGiorno.fumate === 0
      ? 'Nessuna sigaretta. Giornata pulita.'
      : `${delGiorno.fumate} ${delGiorno.fumate === 1 ? 'fumata' : 'fumate'}, ` +
        `${delGiorno.sgarri === 0 ? 'nessuno sgarro' : `${delGiorno.sgarri} sgarri`}`;

  return (
    <main>
      <h1 className="saluto">Statistiche</h1>
      <p className="sottotitolo">I numeri non trattano bene nessuno.</p>

      <h2>Report economico</h2>
      <div className="griglia">
        <div className="scheda">
          <div className="scheda__etichetta">Spesa sigarette</div>
          <div className="scheda__valore">{formattaEuro(report.spesaSigarette)}</div>
        </div>
        <div className="scheda">
          <div className="scheda__etichetta">Risparmio</div>
          <div className="scheda__valore">{formattaEuro(report.risparmio)}</div>
        </div>
        <div className="scheda">
          <div className="scheda__etichetta">Multe versate</div>
          <div className="scheda__valore">{formattaEuro(report.multeVersate)}</div>
        </div>
        <div className={report.multeDaVersare > 0 ? 'scheda scheda--allarme' : 'scheda'}>
          <div className="scheda__etichetta">Multe da versare</div>
          <div className="scheda__valore">{formattaEuro(report.multeDaVersare)}</div>
        </div>
      </div>

      <h2 style={{ marginTop: '1.5rem' }}>Giorno per giorno</h2>
      <ul>
        {[...perGiorno.entries()].reverse().map(([giorno, g]) => (
          <li key={giorno}>
            Giorno {giorno + 1}: {g.fumate} sigarette{g.sgarri > 0 ? `, ${g.sgarri} sgarri` : ', nessuno sgarro'}
          </li>
        ))}
      </ul>

      <h2 style={{ marginTop: '1.5rem' }}>Me ne sono dimenticata una</h2>
      <p className="sottotitolo">Aggiungila con la sua ora vera. Timer, sgarri e multe si ricalcolano.</p>
      <label className="campo">
        <span className="campo__etichetta">Data e ora</span>
        <input
          className="campo__input"
          type="datetime-local"
          value={retroattiva}
          onChange={(e) => setRetroattiva(e.target.value)}
        />
      </label>
      <button className="pulsante-primario" onClick={aggiungiRetroattiva}>
        AGGIUNGI SIGARETTA
      </button>

      <h2 style={{ marginTop: '1.5rem' }}>Storico del giorno</h2>
      <div className="navigatore-giorno">
        <button
          className="pulsante-secondario"
          aria-label="Giorno precedente"
          onClick={() => setGiornoMostrato(giornoPrecedente(giornoMostrato))}
        >
          ‹
        </button>
        <strong>{etichettaGiorno(giornoMostrato)}</strong>
        <button
          className="pulsante-secondario"
          aria-label="Giorno successivo"
          disabled={giornoMostrato >= oggi}
          onClick={() => setGiornoMostrato(giornoSuccessivo(giornoMostrato))}
        >
          ›
        </button>
      </div>
      <label className="campo">
        <span className="campo__etichetta">Vai al giorno</span>
        <input
          className="campo__input"
          type="date"
          max={oggi}
          value={giornoMostrato}
          onChange={(e) => e.target.value && setGiornoMostrato(e.target.value)}
        />
      </label>
      <p className="sottotitolo">{riepilogo}</p>
      <ul>
        {delGiorno.sigarette.map((s) => (
          <li key={s.timestamp}>
            {new Date(s.timestamp).toLocaleTimeString('it-IT', { timeStyle: 'short' })}
            {s.sgarro
              ? ` — sgarro, ${s.minutiAnticipo} min di anticipo`
              : s.usaCredito
                ? ' — con credito'
                : ' — regolare'}{' '}
            <button className="pulsante-secondario" onClick={() => cancella(s.timestamp)}>
              Elimina
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}

async function cancella(timestamp: number) {
  const record = await db.smokes.where('timestamp').equals(timestamp).first();
  if (record?.id) await annullaFumata(record.id);
}
