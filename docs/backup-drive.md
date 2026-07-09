# Attivare il backup su Google Drive

L'app funziona senza. Se il Client ID non c'e, Impostazioni mostra "Backup Drive non
configurato" e restano export/import JSON manuali.

Il backup e un **unico file JSON in `appDataFolder`**: una cartella privata dell'app, che
non compare tra i tuoi file su Drive e che nessun'altra app puo leggere. Lo scope richiesto
e solo `drive.appdata`: l'app non vede il resto del tuo Drive.

## 1. Crea il Client ID (una volta sola)

1. Vai su <https://console.cloud.google.com/> e crea un progetto, es. `smoke-timer`.
2. **API e servizi → Libreria** → cerca *Google Drive API* → **Abilita**.
3. **API e servizi → Schermata consenso OAuth**:
   - tipo utente: **Esterno**;
   - nome app: `Smoke Timer`, email di supporto: la tua;
   - **Ambiti**: aggiungi `.../auth/drive.appdata`;
   - **Utenti di test**: aggiungi il tuo indirizzo Gmail.

   Lasciandola in stato *Test* l'app resta utilizzabile solo dagli utenti di test che
   elenchi: e esattamente quello che serve. Non serve la verifica Google.
4. **API e servizi → Credenziali → Crea credenziali → ID client OAuth**:
   - tipo: **Applicazione web**;
   - **Origini JavaScript autorizzate**:
     - `https://paolodipietro87-lab.github.io`
     - `http://localhost:5173` (per lo sviluppo)
   - nessun URI di reindirizzamento: il flusso a token non lo usa.
5. Copia il **Client ID** (finisce con `.apps.googleusercontent.com`).

## 2. In locale

Crea un file `.env.local` (gia ignorato da git):

```
VITE_GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
```

Poi `npm run dev`. In Impostazioni compaiono "Salva su Drive" e "Ripristina da Drive".

## 3. In produzione (GitHub Pages)

```bash
gh secret set GOOGLE_CLIENT_ID -R paolodipietro87-lab/paolo-stopsmoke
```

Il workflow lo inietta al momento della build. Al primo push successivo il backup e attivo.

Il Client ID **non e un segreto**: finisce comunque nel bundle JavaScript, come previsto dal
flusso OAuth pubblico. Lo teniamo in un secret solo per non scriverlo nel repository. La
sicurezza sta nelle origini autorizzate: un Client ID rubato non funziona da un altro dominio.

## Cosa aspettarsi

- **Salva su Drive**: apre il popup Google, chiede il permesso, carica il JSON. Se il file
  esiste gia viene sovrascritto (`PATCH`), non duplicato.
- **Ripristina da Drive**: scarica il JSON e **sostituisce** i dati locali. Non fonde.
- Il token di accesso non viene mai salvato: scade da solo, e alla prossima operazione
  Google richiede l'autorizzazione.
