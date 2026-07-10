import type { SigarettaValutata } from './engine';
import { CREDITO_MAX } from './credit';
import { chiaveGiorno, giornoSuccessivo } from './storico';

export type EsitoObiettivo = 'in-corso' | 'riuscito' | 'fallito';

/** Solo le sigarette del giorno in esame, piu il contesto che serve a valutarlo. */
export interface StatoGiorno {
  sigarette: readonly SigarettaValutata[];
  targetOggi: number;
  credito: number;
  /** Ora locale in cui finisce la finestra notturna: `cfg.notte.fineOra`. */
  fineNotteOra: number;
  /** Chiave YYYY-MM-DD del giorno che questo stato descrive (formato di `chiaveGiorno`). */
  giorno: string;
}

export interface Obiettivo {
  id: string;
  testo: string;
  esito: (g: StatoGiorno, ora: number) => EsitoObiettivo;
}

const oraDi = (t: number) => new Date(t).getHours();

/**
 * La giornata di `g.giorno` e finita quando `ora` raggiunge o supera la
 * mezzanotte che segue `g.giorno`. Calcolata dal giorno successivo (non da
 * `ora` stessa) cosi resta corretta a qualunque orario del giorno dopo, non
 * solo esattamente a mezzanotte, e attorno al cambio di ora legale.
 */
function giornoFinito(g: StatoGiorno, ora: number): boolean {
  const [a, m, gg] = giornoSuccessivo(g.giorno).split('-').map(Number);
  const mezzanotteSuccessiva = new Date(a, m - 1, gg, 0, 0, 0, 0).getTime();
  return ora >= mezzanotteSuccessiva;
}

/**
 * Obiettivo che si puo solo perdere: finche la condizione regge e la giornata e
 * aperta resta in corso, a mezzanotte diventa riuscito.
 */
function daDifendere(violato: (g: StatoGiorno) => boolean): Obiettivo['esito'] {
  return (g, ora) => {
    if (violato(g)) return 'fallito';
    return giornoFinito(g, ora) ? 'riuscito' : 'in-corso';
  };
}

/**
 * Obiettivo che si puo solo conquistare: appena la condizione e vera e riuscito,
 * a mezzanotte senza averla raggiunta e fallito.
 */
function daConquistare(raggiunto: (g: StatoGiorno) => boolean): Obiettivo['esito'] {
  return (g, ora) => {
    if (raggiunto(g)) return 'riuscito';
    return giornoFinito(g, ora) ? 'fallito' : 'in-corso';
  };
}

/**
 * Obiettivo con una scadenza intraday: superata l'ora limite senza violazioni, e vinto.
 * L'ora limite va confrontata col giorno a cui `ora` appartiene, non solo con
 * l'orologio: valutato nella notte del giorno successivo (o oltre) la giornata
 * di `g.giorno` e comunque chiusa e va dichiarata riuscita; valutato in un
 * giorno precedente a `g.giorno` resta invece in corso.
 */
function entroLOra(oraLimite: (g: StatoGiorno) => number, violato: (g: StatoGiorno) => boolean): Obiettivo['esito'] {
  return (g, ora) => {
    if (violato(g)) return 'fallito';
    if (giornoFinito(g, ora)) return 'riuscito';
    const stessoGiorno = chiaveGiorno(ora) === g.giorno;
    return stessoGiorno && oraDi(ora) >= oraLimite(g) ? 'riuscito' : 'in-corso';
  };
}

export const POOL_OBIETTIVI: readonly Obiettivo[] = [
  {
    id: 'niente-sgarri-mattina',
    testo: 'Nessuno sgarro prima di mezzogiorno',
    esito: entroLOra(
      () => 12,
      (g) => g.sigarette.some((s) => s.sgarro && oraDi(s.timestamp) < 12),
    ),
  },
  {
    id: 'giornata-senza-sgarri',
    testo: 'Nessuno sgarro in tutta la giornata',
    esito: daDifendere((g) => g.sigarette.some((s) => s.sgarro)),
  },
  {
    id: 'matura-un-credito',
    testo: 'Matura almeno un credito',
    esito: daConquistare((g) => g.credito >= 1 || g.sigarette.some((s) => s.usaCredito)),
  },
  {
    id: 'sotto-il-target',
    testo: 'Resta sotto il target del giorno',
    esito: daDifendere((g) => g.sigarette.length >= g.targetOggi),
  },
  {
    id: 'meta-del-target',
    testo: 'Fermati a meta del target',
    esito: daDifendere((g) => g.sigarette.length >= Math.floor(g.targetOggi / 2)),
  },
  {
    id: 'niente-fumo-prima-delle-nove',
    testo: 'Nessuna sigaretta prima delle 9',
    esito: entroLOra(
      () => 9,
      (g) => g.sigarette.some((s) => oraDi(s.timestamp) < 9),
    ),
  },
  {
    id: 'niente-fumo-dopo-le-22',
    testo: 'Nessuna sigaretta dopo le 22',
    esito: daDifendere((g) => g.sigarette.some((s) => oraDi(s.timestamp) >= 22)),
  },
  {
    id: 'nessuna-sigaretta-col-credito',
    testo: 'Non spendere il credito',
    esito: daDifendere((g) => g.sigarette.some((s) => s.usaCredito)),
  },
  {
    id: 'prima-ora-sveglio-pulita',
    testo: 'Nessuna sigaretta nella prima ora di sveglia',
    esito: entroLOra(
      (g) => g.fineNotteOra + 1,
      (g) => g.sigarette.some((s) => oraDi(s.timestamp) < g.fineNotteOra + 1),
    ),
  },
  {
    id: 'credito-pieno-a-fine-giornata',
    testo: 'Chiudi la giornata col credito pieno',
    esito: daConquistare((g) => g.credito >= CREDITO_MAX),
  },
];

/** Somma dei caratteri della data: deterministica, stabile fra reinstallazioni. */
function semeGiorno(giorno: string): number {
  let n = 0;
  for (const c of giorno) n = (n * 131 + c.charCodeAt(0)) >>> 0;
  return n;
}

/**
 * I due obiettivi del giorno. Deterministici sulla data: la stessa giornata
 * produce sempre la stessa coppia, anche dopo un ripristino da Drive. Nessun
 * random, nessuna persistenza.
 */
export function obiettiviDelGiorno(giorno: string): [Obiettivo, Obiettivo] {
  const seme = semeGiorno(giorno);
  const n = POOL_OBIETTIVI.length;
  const primo = seme % n;
  // Passo coprimo con n: garantisce secondo != primo per qualunque seme.
  const secondo = (primo + 1 + (Math.trunc(seme / n) % (n - 1))) % n;
  return [POOL_OBIETTIVI[primo], POOL_OBIETTIVI[secondo]];
}
