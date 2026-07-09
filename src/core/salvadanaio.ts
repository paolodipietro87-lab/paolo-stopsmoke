/**
 * App unica "Poste Italiane" (ha sostituito BancoPosta il 30/6/2025 e Postepay il 9/10/2025).
 * Verificato sul Play Store: posteitaliane.posteapp.appposteid e invece PosteID, un'altra app.
 */
export const PACKAGE_POSTE = 'com.posteitaliane.spim';

const PLAY_STORE = `https://play.google.com/store/apps/details?id=${PACKAGE_POSTE}`;

/**
 * Link per aprire l'app bancaria dell'utente. Su Android un intent URL apre l'app
 * installata e, se manca, ricade sul Play Store. L'app non muove denaro: il
 * versamento lo autorizza sempre l'utente dentro la sua app.
 */
export function linkApriBanca(deepLinkConfigurato: string | undefined): string {
  const personalizzato = deepLinkConfigurato?.trim();
  if (personalizzato) return personalizzato;

  return `intent://#Intent;package=${PACKAGE_POSTE};S.browser_fallback_url=${encodeURIComponent(PLAY_STORE)};end`;
}
