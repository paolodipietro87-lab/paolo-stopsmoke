/**
 * Backup su Google Drive: un unico file JSON in `appDataFolder`, cartella
 * privata dell'app che l'utente non vede tra i suoi file e che nessun'altra
 * app puo leggere. Scope minimo: drive.appdata.
 */
export const NOME_FILE_BACKUP = 'smoke-timer-backup.json';
export const SCOPE_DRIVE = 'https://www.googleapis.com/auth/drive.appdata';

const API = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';

type Fetch = typeof fetch;

export function driveConfigurato(clientId: string | undefined): boolean {
  return Boolean(clientId && clientId.trim());
}

async function esigi(risposta: Response, cosa: string): Promise<Response> {
  if (!risposta.ok) throw new Error(`Drive: ${cosa} fallito (HTTP ${risposta.status}).`);
  return risposta;
}

/** Id del backup gia presente in appDataFolder, o null. */
async function trovaFile(token: string, f: Fetch): Promise<string | null> {
  const url = `${API}?spaces=appDataFolder&fields=files(id,name)&q=${encodeURIComponent(`name='${NOME_FILE_BACKUP}'`)}`;
  const risposta = await esigi(await f(url, { headers: { Authorization: `Bearer ${token}` } }), 'ricerca');
  const dati = (await risposta.json()) as { files?: { id: string }[] };
  return dati.files?.[0]?.id ?? null;
}

/** Crea o sovrascrive il backup. Restituisce l'id del file su Drive. */
export async function caricaBackup(token: string, json: string, f: Fetch = fetch): Promise<string> {
  const idEsistente = await trovaFile(token, f);

  const confine = '-------smoke-timer';
  const metadati = idEsistente
    ? { name: NOME_FILE_BACKUP }
    : { name: NOME_FILE_BACKUP, parents: ['appDataFolder'] };

  const corpo =
    `--${confine}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadati)}\r\n` +
    `--${confine}\r\nContent-Type: application/json\r\n\r\n${json}\r\n` +
    `--${confine}--`;

  const url = idEsistente
    ? `${UPLOAD}/${idEsistente}?uploadType=multipart`
    : `${UPLOAD}?uploadType=multipart`;

  const risposta = await esigi(
    await f(url, {
      method: idEsistente ? 'PATCH' : 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${confine}`,
      },
      body: corpo,
    }),
    'upload',
  );

  const dati = (await risposta.json()) as { id: string };
  return dati.id;
}

/** Contenuto del backup su Drive, o null se non ce n'e uno. */
export async function scaricaBackup(token: string, f: Fetch = fetch): Promise<string | null> {
  const id = await trovaFile(token, f);
  if (!id) return null;

  const risposta = await esigi(
    await f(`${API}/${id}?alt=media`, { headers: { Authorization: `Bearer ${token}` } }),
    'download',
  );
  return risposta.text();
}
