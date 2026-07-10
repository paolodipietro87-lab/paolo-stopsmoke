/** Countdown leggibile a colpo d'occhio: mm:ss, oppure h:mm:ss oltre l'ora. */
export function formattaDurata(secondi: number): string {
  const t = Math.max(0, Math.floor(secondi));
  const ore = Math.floor(t / 3600);
  const min = Math.floor((t % 3600) / 60);
  const sec = t % 60;
  const due = (n: number) => String(n).padStart(2, '0');
  return ore > 0 ? `${ore}:${due(min)}:${due(sec)}` : `${due(min)}:${due(sec)}`;
}

export function formattaEuro(importo: number): string {
  return `${importo.toFixed(2).replace('.', ',')} €`;
}

export function formattaData(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
}

/** "nessuno sgarro" / "1 sgarro" / "3 sgarri". */
export function sgarriInLettere(n: number): string {
  if (n === 0) return 'nessuno sgarro';
  return n === 1 ? '1 sgarro' : `${n} sgarri`;
}
