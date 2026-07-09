import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db, registraAcquisto } from '../data/db';
import { formattaData, formattaEuro } from './format';

function oggiInput(): string {
  return new Date().toISOString().slice(0, 10);
}

export function Acquisti() {
  const acquisti = useLiveQuery(() => db.purchases.orderBy('timestamp').reverse().toArray(), []);
  const [pacchetti, setPacchetti] = useState(1);
  const [prezzo, setPrezzo] = useState(5.5);
  const [data, setData] = useState(oggiInput);

  async function salva() {
    await registraAcquisto({
      timestamp: new Date(data).getTime(),
      numeroPacchetti: pacchetti,
      prezzoTotale: prezzo,
    });
  }

  const speso = (acquisti ?? []).reduce((n, a) => n + a.prezzoTotale, 0);

  return (
    <main>
      <h1 className="saluto">Acquisti</h1>
      <p className="sottotitolo">Ogni pacchetto comprato e denaro bruciato. Registralo.</p>

      <label className="campo">
        <span className="campo__etichetta">Pacchetti</span>
        <input
          className="campo__input"
          type="number"
          min={1}
          value={pacchetti}
          onChange={(e) => setPacchetti(Math.max(1, Number(e.target.value)))}
        />
      </label>
      <label className="campo">
        <span className="campo__etichetta">Prezzo totale</span>
        <input
          className="campo__input"
          type="number"
          step="0.10"
          value={prezzo}
          onChange={(e) => setPrezzo(Number(e.target.value))}
        />
      </label>
      <label className="campo">
        <span className="campo__etichetta">Data</span>
        <input className="campo__input" type="date" value={data} onChange={(e) => setData(e.target.value)} />
      </label>
      <button className="pulsante-primario" onClick={salva}>
        REGISTRA ACQUISTO
      </button>

      <div className="griglia">
        <div className="scheda">
          <div className="scheda__etichetta">Spesa totale</div>
          <div className="scheda__valore">{formattaEuro(speso)}</div>
        </div>
        <div className="scheda">
          <div className="scheda__etichetta">Pacchetti</div>
          <div className="scheda__valore">{(acquisti ?? []).reduce((n, a) => n + a.numeroPacchetti, 0)}</div>
        </div>
      </div>

      <ul>
        {(acquisti ?? []).map((a) => (
          <li key={a.id}>
            {formattaData(a.timestamp)} — {a.numeroPacchetti} pacchetti — {formattaEuro(a.prezzoTotale)}
          </li>
        ))}
      </ul>
    </main>
  );
}
