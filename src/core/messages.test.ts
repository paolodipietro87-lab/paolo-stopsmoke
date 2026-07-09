import { describe, expect, test } from 'vitest';
import { MESSAGGI, categoriaSgarro, messaggio } from './messages';

describe('MESSAGGI', () => {
  test('ogni categoria ha almeno 15 messaggi', () => {
    for (const [categoria, lista] of Object.entries(MESSAGGI)) {
      expect(lista.length, categoria).toBeGreaterThanOrEqual(15);
    }
  });

  test('nessun messaggio duplicato dentro una categoria', () => {
    for (const [categoria, lista] of Object.entries(MESSAGGI)) {
      expect(new Set(lista).size, categoria).toBe(lista.length);
    }
  });
});

describe('messaggio', () => {
  test('e deterministico sullo stesso seed', () => {
    expect(messaggio('timerRispettato', 1234)).toBe(messaggio('timerRispettato', 1234));
  });

  test('ruota al variare del seed', () => {
    const visti = new Set([0, 1, 2, 3, 4].map((s) => messaggio('sgarroLieve', s)));
    expect(visti.size).toBe(5);
  });

  test('regge seed negativi e non interi', () => {
    expect(MESSAGGI.milestone).toContain(messaggio('milestone', -7.9));
  });
});

describe('categoriaSgarro', () => {
  test('sotto i 20 minuti e lieve', () => {
    expect(categoriaSgarro(19)).toBe('sgarroLieve');
  });

  test('da 20 minuti in su e pesante', () => {
    expect(categoriaSgarro(20)).toBe('sgarroPesante');
  });
});
