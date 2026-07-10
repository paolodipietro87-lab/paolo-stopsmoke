import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import type { DatiBadge } from '../core/badge';
import { CREDITO_MAX } from '../core/credit';
import { giornoDiPiano, valutaSigarette, type ConfigPiano, type StatoPiano } from '../core/engine';
import { intervalloBase, intervalloGiorno } from '../core/interval';
import { FINESTRA_DEFAULT } from '../core/nightWindow';
import { obiettiviDelGiorno, type StatoGiorno } from '../core/obiettivi';
import {
  giorniNelPiano,
  giorniPulitiDopoSgarroPesante,
  mediaSigaretteGiorniChiusi,
  notteIntera,
  timerRispettatiDiFila,
} from '../core/progressi';
import {
  costoSigaretta,
  prossimaSigaretta,
  risparmio,
  streakMassima,
  streakSenzaSgarri,
  type ProssimaSigaretta,
} from '../core/stats';
import { chiaveGiorno, sigaretteDelGiorno } from '../core/storico';
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
  datiBadge?: DatiBadge;
}

export function usePiano(): VistaPiano {
  const ora = useOra();
  const profilo = useLiveQuery(() => leggiProfilo(), []);
  const smokes = useLiveQuery(() => db.smokes.orderBy('timestamp').toArray(), []);
  const pause = useLiveQuery(() => db.pauses.toArray(), []);
  const multe = useLiveQuery(() => db.penalties.where('stato').equals('da_versare').toArray(), []);
  const multeVersate = useLiveQuery(() => db.penalties.where('stato').equals('versata').toArray(), []);
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

  const prossima = prossimaSigaretta(stato, cfg, ora);
  const risparmioCalcolato = risparmio({
    sigaretteFumate: smokes.length,
    giorniTrascorsi: giornoCorrente + 1,
    sigaretteAlGiornoIniziali: profilo.sigaretteAlGiornoIniziali,
    prezzoPacchetto: profilo.prezzoPacchetto,
  });
  const oreSmokeFreeCalcolate = stato.riferimentoTimer === null ? 0 : (ora - ultimoTimestamp(smokes)) / 3_600_000;

  const intervalloCorrenteMin = intervalloGiorno(
    giornoCorrente,
    cfg.intervalloBaseMin,
    cfg.incrementoGiornalieroMin,
    stato.giorniCongelati,
  );
  const versate = multeVersate ?? [];

  // Per il badge di riduzione si usa la media delle sigarette fumate negli
  // ultimi 7 giorni chiusi (oggi escluso), non il target teorico del piano:
  // usare il target premierebbe l'avanzamento del programma anche se
  // l'utente ha fumato quanto prima, e diOggi.length varrebbe 0 a ogni
  // inizio giornata, sbloccando i badge prima ancora della prima sigaretta.
  // Quando non esiste ancora nessun giorno chiuso (piano appena iniziato) si
  // passa sigaretteAlGiornoIniziali: la riduzione risulta zero, i badge
  // restano bloccati finche non c'e almeno una giornata intera di dati.
  const mediaGiorniChiusi = mediaSigaretteGiorniChiusi(stato, ora, 7);
  const sigaretteMediaBadge = mediaGiorniChiusi ?? profilo.sigaretteAlGiornoIniziali;

  // Anche qui si contano solo i giorni chiusi: streakSenzaSgarri include il
  // giorno corrente, ancora in corso, che non e "un giorno intero rispettato"
  // finche non finisce. Conservativo: mai regalare il badge a meta giornata.
  const giorniPulitiCompletati = giornoCorrente > 0 ? streakSenzaSgarri(stato, giornoCorrente - 1) : 0;

  const datiBadge: DatiBadge = {
    giorniPuliti: giorniPulitiCompletati,
    streakMax: streakMassima(stato, giornoCorrente),
    risparmioEuro: risparmioCalcolato,
    sigaretteOggi: sigaretteMediaBadge,
    sigaretteAlGiornoIniziali: profilo.sigaretteAlGiornoIniziali,
    oreSmokeFree: oreSmokeFreeCalcolate,
    timerRispettatiDiFila: timerRispettatiDiFila(stato),
    intervalloCorrenteMin,
    creditoMax: creditoMassimo(stato, prossima.credito),
    giorniNelPiano: giorniNelPiano(cfg, ora),
    multeVersateEuro: versate.reduce((n, m) => n + m.importo, 0),
    multeVersateCount: versate.length,
    notteIntera: notteIntera(stato, cfg),
    giorniPulitiDopoSgarroPesante: giorniPulitiDopoSgarroPesante(stato, giornoCorrente),
    obiettiviCentratiDiFila: obiettiviCentratiDiFila(stato, cfg, ora),
  };

  return {
    caricamento: false,
    profilo,
    cfg,
    stato,
    prossima,
    ora,
    giornoCorrente,
    // Attenzione: questo e VistaPiano.sigaretteOggi, usato dalla card "Oggi"
    // della Dashboard (consumo reale del giorno in corso). E diverso da
    // datiBadge.sigaretteOggi sopra, che alimenta i badge di riduzione.
    sigaretteOggi: diOggi.length,
    sgarriOggi: diOggi.filter((s) => s.sgarro).length,
    streak: streakSenzaSgarri(stato, giornoCorrente),
    streakMax: streakMassima(stato, giornoCorrente),
    oreSmokeFree: oreSmokeFreeCalcolate,
    risparmioEuro: risparmioCalcolato,
    multeDaVersareEuro: (multe ?? []).reduce((n, m) => n + m.importo, 0),
    scorta: Math.max(0, comprate - smokes.length),
    datiBadge,
  };
}

/**
 * Il credito massimo mai raggiunto. Due sigarette consecutive entrambe a credito
 * provano che il credito era pieno: e l'unica traccia che i timestamp lasciano.
 */
function creditoMassimo(stato: StatoPiano, creditoOra: number): number {
  const s = stato.sigarette;
  for (let i = 1; i < s.length; i++) {
    if (s[i].usaCredito && s[i - 1].usaCredito) return CREDITO_MAX;
  }
  return creditoOra;
}

/**
 * Giorni chiusi consecutivi, a ritroso da ieri, in cui entrambi i mini-obiettivi
 * sono riusciti. Il credito storico non e ricostruibile a costo ragionevole:
 * si passa 0, quindi gli obiettivi che dipendono dal credito risultano falliti
 * nei giorni passati. Il badge resta conservativo: mai regalato.
 */
function obiettiviCentratiDiFila(stato: StatoPiano, cfg: ConfigPiano, ora: number): number {
  let n = 0;
  for (let indietro = 1; indietro <= 400; indietro++) {
    const giorno = new Date(ora);
    giorno.setHours(12, 0, 0, 0);
    giorno.setDate(giorno.getDate() - indietro);
    const chiave = chiaveGiorno(giorno.getTime());

    const delGiorno = sigaretteDelGiorno(stato.sigarette, chiave);
    if (delGiorno.fumate === 0) break;

    const giornoPiano = giornoDiPiano(giorno.getTime(), cfg.inizioPiano);
    const g: StatoGiorno = {
      sigarette: delGiorno.sigarette,
      targetOggi: Math.max(
        0,
        Math.floor(
          1440 /
            intervalloGiorno(giornoPiano, cfg.intervalloBaseMin, cfg.incrementoGiornalieroMin, stato.giorniCongelati),
        ),
      ),
      credito: 0,
      fineNotteOra: cfg.notte.fineOra,
      giorno: chiave,
    };

    const mezzanotteDopo = new Date(giorno);
    mezzanotteDopo.setHours(24, 0, 0, 0);
    const tuttiRiusciti = obiettiviDelGiorno(chiave).every(
      (o) => o.esito(g, mezzanotteDopo.getTime()) === 'riuscito',
    );
    if (!tuttiRiusciti) break;
    n++;
  }
  return n;
}
