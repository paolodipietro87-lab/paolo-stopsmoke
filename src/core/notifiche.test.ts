import { describe, expect, test } from 'vitest';
import { ritardoNotifica, TESTO_NOTIFICA } from './notifiche';

const d = (s: string) => new Date(s).getTime();

describe('ritardoNotifica', () => {
  test('nessuna scadenza: niente da programmare', () => {
    expect(ritardoNotifica(null, d('2026-07-09T10:00'))).toBeNull();
  });

  test('scadenza futura: ritardo in millisecondi', () => {
    expect(ritardoNotifica(d('2026-07-09T11:00'), d('2026-07-09T10:00'))).toBe(3_600_000);
  });

  test('scadenza gia passata: niente notifica, il countdown e gia verde', () => {
    expect(ritardoNotifica(d('2026-07-09T09:00'), d('2026-07-09T10:00'))).toBeNull();
  });

  test('scadenza esatta ora: niente notifica', () => {
    expect(ritardoNotifica(d('2026-07-09T10:00'), d('2026-07-09T10:00'))).toBeNull();
  });

  test('il testo e severo e non celebra', () => {
    expect(TESTO_NOTIFICA.titolo).toBe('Timer scaduto.');
    expect(TESTO_NOTIFICA.corpo).toContain('Puoi fumare');
  });
});
