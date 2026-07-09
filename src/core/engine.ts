import { creditAt } from './credit';
import { intervalloGiorno } from './interval';
import type { FinestraNotturna } from './nightWindow';
import { giorniCongelatiDaPause, type Pausa } from './pause';

const MIN = 60_000;

export interface ConfigPiano {
  intervalloBaseMin: number;
  incrementoGiornalieroMin: number;
  notte: FinestraNotturna;
  /** Importo in euro di una singola multa (costo di 2 sigarette). */
  multaPerSgarro: number;
  /** Mezzanotte locale del primo giorno di piano. */
  inizioPiano: number;
  /** Pause volontarie: nei giorni coperti la progressione resta ferma. */
  pause?: readonly Pausa[];
}

export interface SigarettaValutata {
  timestamp: number;
  giorno: number;
  sgarro: boolean;
  usaCredito: boolean;
  minutiAnticipo: number;
  multa: number;
}

export interface StatoPiano {
  sigarette: SigarettaValutata[];
  /** Indici dei giorni di piano in cui la progressione non cresce. */
  giorniCongelati: number[];
  /** Minuti rubati non ancora recuperati: maggiorano il prossimo intervallo. */
  debitoResiduoMin: number;
  multeTotali: number;
  /** Timestamp da cui parte il countdown corrente. */
  riferimentoTimer: number | null;
  /** Crediti gia consumati a partire dal riferimento. */
  creditiConsumati: number;
}

/** Indice del giorno di piano (0-based) a cui appartiene `t`, in timezone locale. */
export function giornoDiPiano(t: number, inizioPiano: number): number {
  const a = new Date(inizioPiano);
  a.setHours(0, 0, 0, 0);
  const b = new Date(t);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / (1440 * MIN));
}

/**
 * Ricostruisce lo stato del piano dai soli timestamp delle sigarette.
 * Puro e idempotente: una registrazione retroattiva si gestisce semplicemente
 * ri-eseguendo questa funzione sull'elenco completo.
 */
export function valutaSigarette(timestamps: readonly number[], cfg: ConfigPiano): StatoPiano {
  const ordinati = [...timestamps].sort((a, b) => a - b);

  const sigarette: SigarettaValutata[] = [];
  const giorniConSgarro = new Set<number>();
  let debito = 0;
  let riferimento: number | null = null;
  let creditiConsumati = 0;
  let multeTotali = 0;

  for (const t of ordinati) {
    const giorno = giornoDiPiano(t, cfg.inizioPiano);
    const congelati = [
      ...new Set([
        ...[...giorniConSgarro].map((g) => g + 1),
        ...giorniCongelatiDaPause(cfg.pause ?? [], cfg.inizioPiano, giorno),
      ]),
    ];
    const intervallo = intervalloGiorno(
      giorno,
      cfg.intervalloBaseMin,
      cfg.incrementoGiornalieroMin,
      congelati,
    );

    if (riferimento === null) {
      sigarette.push({ timestamp: t, giorno, sgarro: false, usaCredito: false, minutiAnticipo: 0, multa: 0 });
      riferimento = t;
      creditiConsumati = 0;
      continue;
    }

    const creditoDisponibile = Math.max(
      0,
      creditAt(riferimento, t, { intervalloMin: intervallo, notte: cfg.notte }) - creditiConsumati,
    );

    if (creditoDisponibile > 0) {
      creditiConsumati++;
      sigarette.push({ timestamp: t, giorno, sgarro: false, usaCredito: true, minutiAnticipo: 0, multa: 0 });
      continue;
    }

    const scadenza = riferimento + (intervallo + debito) * MIN;
    if (t >= scadenza) {
      debito = 0;
      sigarette.push({ timestamp: t, giorno, sgarro: false, usaCredito: false, minutiAnticipo: 0, multa: 0 });
    } else {
      const minutiAnticipo = Math.round((scadenza - t) / MIN);
      debito += minutiAnticipo;
      multeTotali += cfg.multaPerSgarro;
      giorniConSgarro.add(giorno);
      sigarette.push({
        timestamp: t,
        giorno,
        sgarro: true,
        usaCredito: false,
        minutiAnticipo,
        multa: cfg.multaPerSgarro,
      });
    }
    riferimento = t;
    creditiConsumati = 0;
  }

  return {
    sigarette,
    giorniCongelati: [...giorniConSgarro].sort((a, b) => a - b).map((g) => g + 1),
    debitoResiduoMin: debito,
    multeTotali: Math.round(multeTotali * 100) / 100,
    riferimentoTimer: riferimento,
    creditiConsumati,
  };
}
