import { useEffect } from 'react';
import { ritardoNotifica, TESTO_NOTIFICA } from '../core/notifiche';

/**
 * Notifica locale best effort alla scadenza del timer: nessun server, nessun push.
 * Il timeout e solo un promemoria, non una fonte di verita: lo stato del countdown
 * resta derivato dai timestamp persistiti anche se la notifica non parte mai
 * (app chiusa da ore, permesso negato, browser che sospende il tab).
 */
export function useNotificaTimer(scadenza: number | null, attive: boolean): void {
  useEffect(() => {
    if (!attive || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    const ritardo = ritardoNotifica(scadenza, Date.now());
    if (ritardo === null) return;

    const id = setTimeout(() => {
      void mostraNotifica();
    }, ritardo);
    return () => clearTimeout(id);
  }, [scadenza, attive]);
}

async function mostraNotifica(): Promise<void> {
  const opzioni: NotificationOptions = { body: TESTO_NOTIFICA.corpo, tag: 'timer-scaduto' };

  // Il service worker sopravvive alla chiusura del tab: e l'unico canale che ha
  // qualche possibilita di consegnare a schermo spento.
  const registrazione = await navigator.serviceWorker?.ready?.catch(() => undefined);
  if (registrazione) {
    await registrazione.showNotification(TESTO_NOTIFICA.titolo, opzioni);
    return;
  }
  new Notification(TESTO_NOTIFICA.titolo, opzioni);
}

/** Chiede il permesso una volta sola. Ritorna true se le notifiche sono utilizzabili. */
export async function chiediPermessoNotifiche(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  return (await Notification.requestPermission()) === 'granted';
}
