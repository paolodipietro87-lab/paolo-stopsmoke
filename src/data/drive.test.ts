import { describe, expect, test, vi } from 'vitest';
import { NOME_FILE_BACKUP, caricaBackup, driveConfigurato, scaricaBackup } from './drive';

const risposta = (corpo: unknown, ok = true, status = 200) =>
  ({ ok, status, json: async () => corpo, text: async () => JSON.stringify(corpo) }) as Response;

describe('driveConfigurato', () => {
  test('false senza client id', () => {
    expect(driveConfigurato('')).toBe(false);
    expect(driveConfigurato(undefined)).toBe(false);
  });

  test('true con un client id', () => {
    expect(driveConfigurato('123.apps.googleusercontent.com')).toBe(true);
  });
});

describe('caricaBackup', () => {
  test('crea il file in appDataFolder se non esiste', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(risposta({ files: [] })) // ricerca
      .mockResolvedValueOnce(risposta({ id: 'nuovo' })); // upload multipart

    const id = await caricaBackup('token', '{"versione":1}', fetch);

    expect(id).toBe('nuovo');
    const [urlUpload, opzioni] = fetch.mock.calls[1];
    expect(urlUpload).toContain('uploadType=multipart');
    expect(opzioni.method).toBe('POST');
    expect(opzioni.headers.Authorization).toBe('Bearer token');
  });

  test('aggiorna il file esistente invece di crearne un altro', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(risposta({ files: [{ id: 'esistente', name: NOME_FILE_BACKUP }] }))
      .mockResolvedValueOnce(risposta({ id: 'esistente' }));

    await caricaBackup('token', '{}', fetch);

    const [url, opzioni] = fetch.mock.calls[1];
    expect(url).toContain('/files/esistente');
    expect(opzioni.method).toBe('PATCH');
  });

  test('un errore HTTP non passa inosservato', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(risposta({ error: 'no' }, false, 403));
    await expect(caricaBackup('token', '{}', fetch)).rejects.toThrow(/403/);
  });
});

describe('scaricaBackup', () => {
  test('null quando su Drive non c e nessun backup', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(risposta({ files: [] }));
    expect(await scaricaBackup('token', fetch)).toBeNull();
  });

  test('restituisce il contenuto del file', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(risposta({ files: [{ id: 'abc' }] }))
      .mockResolvedValueOnce({ ok: true, status: 200, text: async () => '{"versione":1}' } as Response);

    expect(await scaricaBackup('token', fetch)).toBe('{"versione":1}');
    expect(fetch.mock.calls[1][0]).toContain('alt=media');
  });
});
