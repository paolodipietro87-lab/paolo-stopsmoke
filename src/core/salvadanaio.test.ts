import { describe, expect, test } from 'vitest';
import { PACKAGE_POSTE, linkApriBanca } from './salvadanaio';

describe('linkApriBanca', () => {
  test('senza configurazione apre l app Poste Italiane con fallback al Play Store', () => {
    const url = linkApriBanca(undefined);
    expect(url).toContain(`package=${PACKAGE_POSTE}`);
    expect(url.startsWith('intent://')).toBe(true);
    expect(url).toContain(`S.browser_fallback_url=`);
    expect(decodeURIComponent(url)).toContain(`https://play.google.com/store/apps/details?id=${PACKAGE_POSTE}`);
  });

  test('un deep link personalizzato viene usato cosi com e', () => {
    expect(linkApriBanca('revolut://app')).toBe('revolut://app');
  });

  test('spazi e stringa vuota valgono come non configurato', () => {
    expect(linkApriBanca('  ')).toContain(PACKAGE_POSTE);
  });
});
