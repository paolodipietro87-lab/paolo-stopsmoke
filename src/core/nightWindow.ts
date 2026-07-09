export interface FinestraNotturna {
  /** Ora locale di inizio della finestra senza maturazione (default 0). */
  inizioOra: number;
  /** Ora locale di fine (default 7). */
  fineOra: number;
}

export const FINESTRA_DEFAULT: FinestraNotturna = { inizioOra: 0, fineOra: 7 };

const MIN = 60_000;

/** Minuti dalla mezzanotte locale del giorno di `t`. */
function minutiDaMezzanotte(t: number): number {
  const d = new Date(t);
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

function mezzanotteDi(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Minuti trascorsi tra `from` e `to` escludendo la finestra notturna di ogni giorno
 * attraversato. In quella finestra il credito non matura: il conteggio riprende
 * dal punto in cui era rimasto.
 */
export function minutiUtili(from: number, to: number, notte: FinestraNotturna): number {
  if (to <= from) return 0;

  const nInizio = notte.inizioOra * 60;
  const nFine = notte.fineOra * 60;

  let totale = 0;
  for (let giorno = mezzanotteDi(from); giorno < to; giorno += 1440 * MIN) {
    const inizioSegmento = Math.max(from, giorno);
    const fineSegmento = Math.min(to, giorno + 1440 * MIN);
    if (fineSegmento <= inizioSegmento) continue;

    const a = minutiDaMezzanotte(inizioSegmento);
    const b = a + (fineSegmento - inizioSegmento) / MIN;

    const sovrapposizioneNotte = Math.max(0, Math.min(b, nFine) - Math.max(a, nInizio));
    totale += b - a - sovrapposizioneNotte;
  }
  return Math.round(totale);
}
