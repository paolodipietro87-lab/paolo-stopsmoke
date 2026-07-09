import { SCOPE_DRIVE } from './drive';

const SCRIPT_GIS = 'https://accounts.google.com/gsi/client';

interface TokenClient {
  requestAccessToken: (opzioni?: { prompt?: string }) => void;
}

interface RispostaToken {
  access_token?: string;
  error?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (r: RispostaToken) => void;
          }) => TokenClient;
        };
      };
    };
  }
}

export const CLIENT_ID: string | undefined = import.meta.env.VITE_GOOGLE_CLIENT_ID;

let caricamento: Promise<void> | undefined;

function caricaGis(): Promise<void> {
  caricamento ??= new Promise((risolvi, rifiuta) => {
    if (window.google?.accounts) return risolvi();
    const script = document.createElement('script');
    script.src = SCRIPT_GIS;
    script.async = true;
    script.onload = () => risolvi();
    script.onerror = () => rifiuta(new Error('Google Identity Services non raggiungibile.'));
    document.head.appendChild(script);
  });
  return caricamento;
}

/**
 * Token di accesso a Drive. Non viene persistito: scade da solo e al bisogno
 * si richiede di nuovo. L'utente autorizza esplicitamente ogni volta che serve.
 */
export async function chiediToken(clientId = CLIENT_ID): Promise<string> {
  if (!clientId) throw new Error('Backup Drive non configurato: manca VITE_GOOGLE_CLIENT_ID.');
  await caricaGis();

  return new Promise((risolvi, rifiuta) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE_DRIVE,
      callback: (r) => (r.access_token ? risolvi(r.access_token) : rifiuta(new Error(r.error ?? 'Accesso negato.'))),
    });
    client.requestAccessToken();
  });
}
