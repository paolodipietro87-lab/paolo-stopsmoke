# Smoke Timer

PWA per smettere di fumare tramite riduzione graduale. Un timer stabilisce quando puoi
fumare la prossima sigaretta; l'intervallo cresce ogni giorno fino allo zero.

Tutto in locale (IndexedDB), nessun backend, nessun tracciamento.

## Come funziona

- **Timer continuo 24h.** Intervallo iniziale = `1440 / sigarette al giorno`, +N minuti ogni giorno.
- **Credito (max 2).** Il primo intervallo dopo una sigaretta e il countdown normale; ogni
  intervallo pieno successivo matura 1 credito. Di notte (00:00–07:00, configurabile) il
  credito non matura, e a mezzanotte viene tagliato a 1.
- **Sgarro** = sigaretta prima della scadenza, senza credito. Tre penalita cumulative:
  1. i minuti rubati si sommano a un debito che maggiora i timer successivi;
  2. il giorno dopo la progressione non cresce;
  3. multa pari al costo di 2 sigarette, da versare davvero nel salvadanaio.
- **Salvadanaio reale assistito.** "Versa ora" copia l'importo e apre l'app della banca
  (di default Poste Italiane). L'app non muove denaro: il versamento lo autorizzi tu.

Ogni valore deriva dai timestamp persistiti: chiudere l'app o restare offline non altera nulla.

## Sviluppo

```bash
npm install
npm run dev      # http://localhost:5173/paolo-stopsmoke/
npm test         # 130 test: motore, dati, flussi in jsdom
npm run build
```

Le icone PWA si rigenerano con `node scripts/genera-icone.mjs`.

## Deploy

Push su `main` → GitHub Actions esegue test e build e pubblica su GitHub Pages.
`BASE_PATH` viene ricavato dal nome del repository.

## Struttura

| Percorso | Contenuto |
|---|---|
| `src/core/` | Motore puro e testato: intervalli, credito, sgarri, statistiche, messaggi |
| `src/data/` | Dexie/IndexedDB, azioni, backup JSON |
| `src/ui/` | Componenti React, dark mode, anello countdown |
