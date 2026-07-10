import { giornoDiPiano, type ConfigPiano, type StatoPiano } from './engine';
import { SOGLIA_SGARRO_PESANTE_MIN } from './messages';
import { chiaveGiorno, giornoPrecedente, sigaretteDelGiorno } from './storico';

/** Sigarette consecutive senza sgarro, contate dall'ultima all'indietro. */
export function timerRispettatiDiFila(stato: StatoPiano): number {
  let n = 0;
  for (let i = stato.sigarette.length - 1; i >= 0; i--) {
    if (stato.sigarette[i].sgarro) break;
    n++;
  }
  return n;
}

const oraDi = (t: number) => new Date(t).getHours();

/**
 * Almeno una notte attraversata senza fumare, fra due giorni in cui ha fumato.
 * Il vincolo sui due giorni evita di premiare le notti precedenti al piano.
 */
export function notteIntera(stato: StatoPiano, cfg: ConfigPiano): boolean {
  const giorniFumati = new Set(stato.sigarette.map((s) => chiaveGiorno(s.timestamp)));
  if (giorniFumati.size < 2) return false;

  const dentroLaNotte = (t: number) => {
    const h = oraDi(t);
    return h >= cfg.notte.inizioOra && h < cfg.notte.fineOra;
  };

  // Una notte "appartiene" al giorno in cui finisce: quella del 2 luglio va da
  // mezzanotte del 2 alle 7 del 2. Il giorno precedente a g deve essere anch'esso
  // un giorno fumato: solo cosi la notte e davvero "attraversata" fra due giorni
  // consecutivi in cui si e fumato, ed esclude i buchi di tracciamento.
  return [...giorniFumati].some(
    (g) =>
      giorniFumati.has(giornoPrecedente(g)) &&
      !stato.sigarette.some((s) => chiaveGiorno(s.timestamp) === g && dentroLaNotte(s.timestamp)),
  );
}

/** Giorni consecutivi senza sgarri dall ultimo sgarro pesante a oggi. Zero se non ce n e mai stato uno. */
export function giorniPulitiDopoSgarroPesante(stato: StatoPiano, giornoCorrente: number): number {
  const pesanti = stato.sigarette.filter((s) => s.sgarro && s.minutiAnticipo >= SOGLIA_SGARRO_PESANTE_MIN);
  if (pesanti.length === 0) return 0;

  const giornoPesante = pesanti[pesanti.length - 1].giorno;
  const sgarriDopo = stato.sigarette.filter((s) => s.sgarro && s.giorno > giornoPesante);
  if (sgarriDopo.length > 0) return 0;

  return Math.max(0, giornoCorrente - giornoPesante);
}

/** Giorni di piano trascorsi, primo giorno incluso. */
export function giorniNelPiano(cfg: ConfigPiano, ora: number): number {
  return giornoDiPiano(ora, cfg.inizioPiano) + 1;
}

/**
 * Media delle sigarette fumate negli ultimi `giorni` giorni di calendario chiusi
 * (oggi escluso). Ritorna null quando non c'e ancora nessun giorno chiuso: in quel
 * caso i badge di riduzione non devono sbloccarsi.
 */
export function mediaSigaretteGiorniChiusi(
  stato: StatoPiano,
  ora: number,
  giorni: number,
): number | null {
  if (stato.sigarette.length === 0) return null;

  const primoGiorno = stato.sigarette.reduce(
    (min, s) => (chiaveGiorno(s.timestamp) < min ? chiaveGiorno(s.timestamp) : min),
    chiaveGiorno(stato.sigarette[0].timestamp),
  );

  let giorno = giornoPrecedente(chiaveGiorno(ora));
  let somma = 0;
  let conteggio = 0;

  for (let i = 0; i < giorni; i++) {
    if (giorno < primoGiorno) break;
    somma += sigaretteDelGiorno(stato.sigarette, giorno).fumate;
    conteggio++;
    giorno = giornoPrecedente(giorno);
  }

  return conteggio === 0 ? null : somma / conteggio;
}
