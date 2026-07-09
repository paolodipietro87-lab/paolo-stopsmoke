import { describe, expect, test } from 'vitest';
import { TIMELINE_SALUTE, beneficiSbloccati, prossimoBeneficio } from './salute';

describe('TIMELINE_SALUTE', () => {
  test('e ordinata dal beneficio piu rapido al piu lento', () => {
    const ore = TIMELINE_SALUTE.map((b) => b.oreRichieste);
    expect([...ore].sort((a, b) => a - b)).toEqual(ore);
  });

  test('parte dai 20 minuti e arriva a un anno', () => {
    expect(TIMELINE_SALUTE[0].oreRichieste).toBeCloseTo(20 / 60);
    expect(TIMELINE_SALUTE.at(-1)!.oreRichieste).toBe(24 * 365);
  });
});

describe('beneficiSbloccati', () => {
  test('appena smesso nessun beneficio', () => {
    expect(beneficiSbloccati(0)).toEqual([]);
  });

  test('dopo 20 minuti si sblocca la pressione', () => {
    expect(beneficiSbloccati(0.34).map((b) => b.id)).toEqual(['pressione']);
  });

  test('dopo 24 ore il monossido e normalizzato', () => {
    expect(beneficiSbloccati(24).map((b) => b.id)).toContain('monossido');
  });

  test('dopo un anno sono tutti sbloccati', () => {
    expect(beneficiSbloccati(24 * 365)).toHaveLength(TIMELINE_SALUTE.length);
  });
});

describe('prossimoBeneficio', () => {
  test('indica il traguardo successivo', () => {
    expect(prossimoBeneficio(0)?.id).toBe('pressione');
  });

  test('null quando sono tutti sbloccati', () => {
    expect(prossimoBeneficio(24 * 400)).toBeNull();
  });
});
