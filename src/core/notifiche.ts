export const TESTO_NOTIFICA = {
  titolo: 'Timer scaduto.',
  corpo: 'Puoi fumare. Se resisti un altro intervallo, guadagni un credito.',
} as const;

/**
 * Millisecondi da attendere prima di avvisare che il timer e scaduto.
 * null quando non c'e nulla da annunciare: nessuna scadenza, o scadenza gia passata.
 * Deriva sempre dal timestamp di scadenza, mai da un contatore in memoria.
 */
export function ritardoNotifica(scadenza: number | null, ora: number): number | null {
  if (scadenza === null || scadenza <= ora) return null;
  return scadenza - ora;
}
