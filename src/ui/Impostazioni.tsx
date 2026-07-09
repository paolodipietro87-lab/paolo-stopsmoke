import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { FINESTRA_DEFAULT } from '../core/nightWindow';
import { fineEffettivaPausa } from '../core/pause';
import { PACKAGE_POSTE } from '../core/salvadanaio';
import { db, leggiProfilo, salvaProfilo } from '../data/db';
import { iniziaPausa, terminaPausa } from '../data/pauseActions';
import { esportaJson, importaJson } from '../data/backup';

export function Impostazioni() {
  const profilo = useLiveQuery(() => leggiProfilo(), []);
  const pause = useLiveQuery(() => db.pauses.toArray(), []);
  const [errore, setErrore] = useState('');

  // Derivato dai record, non da stato duplicato: la pausa scade da sola dopo 7 giorni.
  const ora = Date.now();
  const attiva = (pause ?? []).find((p) => p.dataInizio <= ora && ora < fineEffettivaPausa(p));
  const inPausa = attiva !== undefined;
  const giorniPausa = attiva ? Math.floor((ora - attiva.dataInizio) / (1440 * 60_000)) : 0;

  if (!profilo) return null;
  const notte = profilo.notte ?? FINESTRA_DEFAULT;

  const aggiorna = (patch: Partial<typeof profilo>) => salvaProfilo({ ...profilo, ...patch });

  async function commutaPausa() {
    setErrore('');
    try {
      if (inPausa) await terminaPausa(Date.now());
      else await iniziaPausa(Date.now());
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Errore');
    }
  }

  async function esporta() {
    const json = await esportaJson();
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `smoke-timer-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importa(file: File) {
    setErrore('');
    try {
      await importaJson(await file.text());
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Backup non valido');
    }
  }

  return (
    <main>
      <h1 className="saluto">Impostazioni</h1>

      <label className="campo">
        <span className="campo__etichetta">Incremento giornaliero (vale da domani)</span>
        <input
          className="campo__input"
          type="number"
          min={1}
          value={profilo.incrementoGiornalieroMin}
          onChange={(e) => aggiorna({ incrementoGiornalieroMin: Math.max(1, Number(e.target.value)) })}
        />
      </label>

      <label className="campo">
        <span className="campo__etichetta">Prezzo pacchetto</span>
        <input
          className="campo__input"
          type="number"
          step="0.10"
          value={profilo.prezzoPacchetto}
          onChange={(e) => aggiorna({ prezzoPacchetto: Number(e.target.value) })}
        />
      </label>

      <label className="campo">
        <span className="campo__etichetta">Multa per sgarro (default: 2 sigarette)</span>
        <input
          className="campo__input"
          type="number"
          step="0.05"
          value={profilo.multaPerSgarro ?? 0}
          onChange={(e) => aggiorna({ multaPerSgarro: Number(e.target.value) })}
        />
      </label>

      <div className="griglia">
        <label className="campo">
          <span className="campo__etichetta">Notte: dalle</span>
          <input
            className="campo__input"
            type="number"
            min={0}
            max={23}
            value={notte.inizioOra}
            onChange={(e) => aggiorna({ notte: { ...notte, inizioOra: Number(e.target.value) } })}
          />
        </label>
        <label className="campo">
          <span className="campo__etichetta">alle</span>
          <input
            className="campo__input"
            type="number"
            min={0}
            max={23}
            value={notte.fineOra}
            onChange={(e) => aggiorna({ notte: { ...notte, fineOra: Number(e.target.value) } })}
          />
        </label>
      </div>

      <label className="campo">
        <span className="campo__etichetta">Deep link app bancaria (vuoto = Poste Italiane, {PACKAGE_POSTE})</span>
        <input
          className="campo__input"
          value={profilo.linkBanca ?? ''}
          placeholder="es. revolut://app"
          onChange={(e) => aggiorna({ linkBanca: e.target.value })}
        />
      </label>

      <h2>Pausa del piano</h2>
      <p className="sottotitolo">
        {inPausa
          ? `Piano in pausa da ${giorniPausa} giorni. Sgarri, spese e multe continuano a contare. Riparte da solo dopo 7 giorni.`
          : 'Metti in pausa la progressione per massimo 7 giorni. Non e una vacanza: e una resa temporanea.'}
      </p>
      <button className="pulsante-secondario" onClick={commutaPausa}>
        {inPausa ? 'Riprendi il piano' : 'Metti in pausa'}
      </button>

      <h2 style={{ marginTop: '1.5rem' }}>Backup</h2>
      <button className="pulsante-secondario" onClick={esporta}>
        Esporta JSON
      </button>{' '}
      <label className="pulsante-secondario">
        Importa JSON
        <input
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => e.target.files?.[0] && importa(e.target.files[0])}
        />
      </label>

      {errore && <p className="sottotitolo" style={{ color: 'var(--rosso)' }}>{errore}</p>}
    </main>
  );
}
