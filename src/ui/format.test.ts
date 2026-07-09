import { describe, expect, test } from 'vitest';
import { formattaDurata, formattaEuro } from './format';

describe('formattaDurata', () => {
  test('sotto l ora: minuti e secondi', () => {
    expect(formattaDurata(2520)).toBe('42:00');
  });

  test('secondi con lo zero davanti', () => {
    expect(formattaDurata(65)).toBe('01:05');
  });

  test('oltre l ora: ore, minuti, secondi', () => {
    expect(formattaDurata(5700)).toBe('1:35:00');
  });

  test('zero', () => {
    expect(formattaDurata(0)).toBe('00:00');
  });

  test('valori negativi diventano zero', () => {
    expect(formattaDurata(-10)).toBe('00:00');
  });
});

describe('formattaEuro', () => {
  test('due decimali con virgola', () => {
    expect(formattaEuro(1.1)).toBe('1,10 €');
  });

  test('arrotonda', () => {
    expect(formattaEuro(0.555)).toBe('0,56 €');
  });
});
