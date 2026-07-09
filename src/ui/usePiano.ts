import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { giornoDiPiano, valutaSigarette, type ConfigPiano, type StatoPiano } from '../core/engine';
import { intervalloBase } from '../core/interval';
import { FINESTRA_DEFAULT } from '../core/nightWindow';
import {
  costoSigaretta,
  prossimaSigaretta,
  risparmio,
  streakMassima,
  streakSenzaSgarri,
  type ProssimaSigaretta,
} from '../core/stats';
import { db, leggiProfilo, type Profilo } from '../data/db';

function ultimoTimestamp(smokes: readonly { timestamp: number }[]): number {
  return smokes.length === 0 ? 0 : smokes[smokes.length - 1].timestamp;
}

/** Tick di solo rendering: lo stato reale viene sempre ricalcolato dai timestamp. */
function useOra(): number {
  const [ora, setOra] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setOra(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return ora;
}

export function configDaProfilo(p: Profilo, pause: readonly { dataInizio: number; dataFine?: number }[] = []): ConfigPiano {
  const inizio = new Date(p.dataInizio);
  inizio.setHours(0, 0, 0, 0);
  return {
    intervalloBaseMin: intervalloBase(p.sigaretteAlGiornoIniziali),
    incrementoGiornalieroMin: p.incrementoGiornalieroMin,
    notte: p.notte ?? FINESTRA_DEFAULT,
    multaPerSgarro: p.multaPerSgarro ?? costoSigaretta(p.prezzoPacchetto) * 2,
    inizioPiano: inizio.getTime(),
    pause,
  };
}

export interface VistaPiano {
  caricamento: boolean;
  profilo?: Profilo;
  cfg?: ConfigPiano;
  stato?: StatoPiano;
  prossima?: ProssimaSigaretta;
  ora: number;
  giornoCorrente: number;
  sigaretteOggi: number;
  sgarriOggi: number;
  streak: number;
  streakMax: number;
  /** Ore dall'ultima sigaretta: alimenta timeline salute e mantenimento. */
  oreSmokeFree: number;
  risparmioEuro: number;
  multeDaVersareEuro: number;
  scorta: number;
}

export function usePiano(): VistaPiano {
  const ora = useOra();
  const profilo = useLiveQuery(() => leggiProfilo(), []);
  const smokes = useLiveQuery(() => db.smokes.orderBy('timestamp').toArray(), []);
  const pause = useLiveQuery(() => db.pauses.toArray(), []);
  const multe = useLiveQuery(() => db.penalties.where('stato').equals('da_versare').toArray(), []);
  const acquisti = useLiveQuery(() => db.purchases.toArray(), []);

  const caricamento = profilo === undefined || smokes === undefined || pause === undefined;
  if (caricamento || !profilo) {
    return {
      caricamento: profilo === undefined,
      ora,
      giornoCorrente: 0,
      sigaretteOggi: 0,
      sgarriOggi: 0,
      streak: 0,
      streakMax: 0,
      oreSmokeFree: 0,
      risparmioEuro: 0,
      multeDaVersareEuro: 0,
      scorta: 0,
    };
  }

  const cfg = configDaProfilo(profilo, pause);
  const stato = valutaSigarette(smokes.map((s) => s.timestamp), cfg);
  const giornoCorrente = giornoDiPiano(ora, cfg.inizioPiano);
  const diOggi = stato.sigarette.filter((s) => s.giorno === giornoCorrente);

  const comprate = (acquisti ?? []).reduce((n, a) => n + a.numeroPacchetti * 20, 0);

  return {
    caricamento: false,
    profilo,
    cfg,
    stato,
    prossima: prossimaSigaretta(stato, cfg, ora),
    ora,
    giornoCorrente,
    sigaretteOggi: diOggi.length,
    sgarriOggi: diOggi.filter((s) => s.sgarro).length,
    streak: streakSenzaSgarri(stato, giornoCorrente),
    streakMax: streakMassima(stato, giornoCorrente),
    oreSmokeFree: stato.riferimentoTimer === null ? 0 : (ora - ultimoTimestamp(smokes)) / 3_600_000,
    risparmioEuro: risparmio({
      sigaretteFumate: smokes.length,
      giorniTrascorsi: giornoCorrente + 1,
      sigaretteAlGiornoIniziali: profilo.sigaretteAlGiornoIniziali,
      prezzoPacchetto: profilo.prezzoPacchetto,
    }),
    multeDaVersareEuro: (multe ?? []).reduce((n, m) => n + m.importo, 0),
    scorta: Math.max(0, comprate - smokes.length),
  };
}
