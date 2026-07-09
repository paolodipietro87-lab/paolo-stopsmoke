import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { linkApriBanca } from '../core/salvadanaio';
import { db, leggiProfilo, segnaMulteVersate } from '../data/db';
import { formattaData, formattaEuro } from './format';

export function Salvadanaio() {
  const profilo = useLiveQuery(() => leggiProfilo(), []);
  const multe = useLiveQuery(() => db.penalties.toArray(), []);
  const [copiato, setCopiato] = useState(false);

  if (!multe) return null;

  const daVersare = multe.filter((m) => m.stato === 'da_versare');
  const versate = multe.filter((m) => m.stato === 'versata');
  const totaleDaVersare = daVersare.reduce((n, m) => n + m.importo, 0);
  const totaleVersato = versate.reduce((n, m) => n + m.importo, 0);

  async function versaOra() {
    const importo = totaleDaVersare.toFixed(2).replace('.', ',');
    try {
      await navigator.clipboard.writeText(importo);
      setCopiato(true);
    } catch {
      setCopiato(false); // niente clipboard: l'importo resta comunque a schermo
    }
    window.location.href = linkApriBanca(profilo?.linkBanca);
  }

  async function hoVersato() {
    await segnaMulteVersate(Date.now());
    setCopiato(false);
  }

  return (
    <main>
      <h1 className="saluto">Salvadanaio multe</h1>
      <p className="sottotitolo">
        Soldi veri, versati da te. L'app non tocca il tuo conto: apre la tua app bancaria e basta.
      </p>

      <div className="griglia">
        <div className={totaleDaVersare > 0 ? 'scheda scheda--allarme' : 'scheda'}>
          <div className="scheda__etichetta">Da versare</div>
          <div className="scheda__valore">{formattaEuro(totaleDaVersare)}</div>
        </div>
        <div className="scheda">
          <div className="scheda__etichetta">Gia versato</div>
          <div className="scheda__valore">{formattaEuro(totaleVersato)}</div>
        </div>
      </div>

      {totaleDaVersare > 0 && (
        <>
          <br />
          <button className="pulsante-primario" onClick={versaOra}>
            VERSA ORA — {formattaEuro(totaleDaVersare)}
          </button>
          {copiato && <p className="sottotitolo">Importo copiato negli appunti. Incollalo nel salvadanaio.</p>}
          <br />
          <button className="pulsante-secondario" onClick={hoVersato}>
            Ho versato
          </button>
          <p className="sottotitolo">
            Se il servizio Poste non risponde (di notte capita), la multa resta da versare. Riprova domattina.
          </p>
        </>
      )}

      <h2 style={{ marginTop: '1.5rem' }}>Storico</h2>
      <ul>
        {multe.length === 0 && <li className="sottotitolo">Nessuna multa. Continua cosi.</li>}
        {multe.map((m) => (
          <li key={m.id}>
            {formattaData(m.timestamp)} — {formattaEuro(m.importo)} — {m.motivo}
            {m.stato === 'versata' && m.dataVersamento
              ? ` — versata il ${formattaData(m.dataVersamento)}`
              : ' — da versare'}
          </li>
        ))}
      </ul>

      <p className="sottotitolo">
        Quel fondo e tuo e resta disponibile: per riprenderlo si chiude l'obiettivo per intero, non a rate.
      </p>
    </main>
  );
}
