import { useRegisterSW } from 'virtual:pwa-register/react';
import { BannerAggiornamento } from './BannerAggiornamento';

/**
 * Collega il service worker al banner. Nessuna logica: solo cablaggio.
 * Vive fuori da App perche importa un modulo virtuale che esiste solo sotto Vite.
 */
export function AggiornamentoPwa() {
  const {
    needRefresh: [nuovaVersione],
    updateServiceWorker,
  } = useRegisterSW();

  return <BannerAggiornamento visibile={nuovaVersione} onAggiorna={() => updateServiceWorker(true)} />;
}
