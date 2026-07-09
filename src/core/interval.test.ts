import { describe, expect, test } from 'vitest';
import { intervalloBase, intervalloGiorno } from './interval';

describe('intervalloBase', () => {
  test('20 sigarette al giorno danno 72 minuti', () => {
    expect(intervalloBase(20)).toBe(72);
  });

  test('arrotonda al minuto piu vicino', () => {
    expect(intervalloBase(7)).toBe(206); // 1440/7 = 205.71
  });
});

describe('intervalloGiorno', () => {
  test('giorno 0 e l intervallo base', () => {
    expect(intervalloGiorno(0, 72, 10, [])).toBe(72);
  });

  test('cresce dell incremento ogni giorno', () => {
    expect(intervalloGiorno(3, 72, 10, [])).toBe(102);
  });

  test('un giorno congelato non fa crescere l intervallo', () => {
    // sgarro nel giorno 0 => il giorno 1 non cresce
    expect(intervalloGiorno(1, 72, 10, [1])).toBe(72);
    expect(intervalloGiorno(2, 72, 10, [1])).toBe(82);
  });

  test('giorni congelati multipli si sommano', () => {
    expect(intervalloGiorno(4, 72, 10, [1, 3])).toBe(92);
  });
});
