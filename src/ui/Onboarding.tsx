import { useState } from 'react';
import { intervalloBase } from '../core/interval';
import { costoSigaretta, giorniAZero } from '../core/stats';
import { fuma } from '../data/actions';
import { salvaProfilo } from '../data/db';
import { configDaProfilo } from './usePiano';
import { formattaEuro } from './format';

const INCREMENTI = [5, 10, 15];

function dataZero(base: number, incremento: number): string {
  const giorni = giorniAZero(base, incremento);
  const d = new Date();
  d.setDate(d.getDate() + giorni);
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
}

function inputLocale(t: number): string {
  const d = new Date(t - new Date().getTimezoneOffset() * 60_000);
  return d.toISOString().slice(0, 16);
}

export function Onboarding({ onFatto }: { onFatto: () => void }) {
  const [passo, setPasso] = useState(0);
  const [nome, setNome] = useState('');
  const [sigarette, setSigarette] = useState(20);
  const [prezzo, setPrezzo] = useState(5.5);
  const [incremento, setIncremento] = useState(10);
  const [marca, setMarca] = useState('');
  const [ultimaFumata, setUltimaFumata] = useState(() => inputLocale(Date.now()));

  const base = intervalloBase(sigarette);

  async function conferma() {
    const profilo = {
      nome: nome.trim() || 'tu',
      dataInizio: Date.now(),
      sigaretteAlGiornoIniziali: sigarette,
      prezzoPacchetto: prezzo,
      incrementoGiornalieroMin: incremento,
      marca: marca.trim() || undefined,
      multaPerSgarro: costoSigaretta(prezzo) * 2,
    };
    await salvaProfilo(profilo);
    await fuma(new Date(ultimaFumata).getTime(), configDaProfilo(profilo));
    onFatto();
  }

  return (
    <main>
      <h1 className="saluto">Smoke Timer</h1>

      {passo === 0 && (
        <>
          <p className="sottotitolo">Nessun account. Nessuna scusa. Iniziamo.</p>
          <label className="campo">
            <span className="campo__etichetta">Come ti chiami</span>
            <input className="campo__input" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
          </label>
          <label className="campo">
            <span className="campo__etichetta">Marca (opzionale)</span>
            <input className="campo__input" value={marca} onChange={(e) => setMarca(e.target.value)} />
          </label>
          <button className="pulsante-primario" onClick={() => setPasso(1)} disabled={!nome.trim()}>
            AVANTI
          </button>
        </>
      )}

      {passo === 1 && (
        <>
          <p className="sottotitolo">Quanto fumi adesso. Numeri veri, non quelli che dici agli altri.</p>
          <label className="campo">
            <span className="campo__etichetta">Sigarette al giorno</span>
            <input
              className="campo__input"
              type="number"
              min={1}
              max={80}
              value={sigarette}
              onChange={(e) => setSigarette(Math.max(1, Number(e.target.value)))}
            />
          </label>
          <label className="campo">
            <span className="campo__etichetta">Prezzo del pacchetto (20 sigarette)</span>
            <input
              className="campo__input"
              type="number"
              step="0.10"
              min={0.5}
              value={prezzo}
              onChange={(e) => setPrezzo(Number(e.target.value))}
            />
          </label>
          <button className="pulsante-primario" onClick={() => setPasso(2)}>
            AVANTI
          </button>
        </>
      )}

      {passo === 2 && (
        <>
          <p className="sottotitolo">
            Oggi: 1 sigaretta ogni {base} minuti. Scegli quanto allunghi l'intervallo ogni giorno.
          </p>
          {INCREMENTI.map((inc) => (
            <label className="campo" key={inc}>
              <input
                type="radio"
                name="incremento"
                checked={incremento === inc}
                onChange={() => setIncremento(inc)}
              />{' '}
              <span>
                +{inc} min/giorno — zero sigarette intorno al {dataZero(base, inc)}
              </span>
            </label>
          ))}
          <button className="pulsante-primario" onClick={() => setPasso(3)}>
            AVANTI
          </button>
        </>
      )}

      {passo === 3 && (
        <>
          <p className="sottotitolo">Quando hai fumato l'ultima sigaretta? Da li parte il primo timer.</p>
          <label className="campo">
            <span className="campo__etichetta">Ultima sigaretta</span>
            <input
              className="campo__input"
              type="datetime-local"
              value={ultimaFumata}
              onChange={(e) => setUltimaFumata(e.target.value)}
            />
          </label>
          <div className="riepilogo">
            <strong>Il piano.</strong>
            <br />
            Oggi: 1 sigaretta ogni {base} minuti.
            <br />
            Ogni giorno: +{incremento} minuti.
            <br />
            Zero sigarette intorno al {dataZero(base, incremento)}.
            <br />
            Ogni sgarro: multa da {formattaEuro(costoSigaretta(prezzo) * 2)} nel salvadanaio, progressione ferma il
            giorno dopo.
            <br />
            Si comincia.
          </div>
          <br />
          <button className="pulsante-primario" onClick={conferma}>
            INIZIA
          </button>
        </>
      )}
    </main>
  );
}
