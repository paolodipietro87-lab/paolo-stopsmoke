import { useEffect, useRef, type RefObject } from 'react';

/**
 * Pubblica l'altezza reale della barra di navigazione nella variabile CSS
 * `--altezza-nav`, che il layout usa per riservare lo spazio in fondo alle pagine.
 *
 * Serve perche la barra e `position: fixed` e le sue voci vanno a capo sugli
 * schermi stretti: passa da una riga a due, e un `padding-bottom` fisso taglia
 * il fondo delle sezioni lunghe. L'altezza va misurata, non indovinata.
 *
 * `ResizeObserver` manca in jsdom e nei browser piu vecchi: in quel caso si
 * misura una volta al montaggio e si lascia al CSS il valore di ripiego.
 */
export function useAltezzaNav<T extends HTMLElement>(): RefObject<T | null> {
  const rif = useRef<T>(null);

  useEffect(() => {
    const nodo = rif.current;
    if (!nodo) return;

    const misura = () => {
      document.documentElement.style.setProperty('--altezza-nav', `${nodo.offsetHeight}px`);
    };
    misura();

    if (typeof ResizeObserver === 'undefined') return;
    const osservatore = new ResizeObserver(misura);
    osservatore.observe(nodo);
    return () => osservatore.disconnect();
  }, []);

  return rif;
}
