# Statistiche per giorno, badge estesi, SOS a scenari

Data: 2026-07-10
Stato: approvato

Tre interventi di prodotto su un'app già online e in uso reale. Nessuno tocca il
motore del timer. Tutti rispettano il vincolo fondativo: **ogni calcolo deriva dai
timestamp persistiti, mai da un contatore in memoria.**

Fuori scope, tracciati altrove: affidabilità della notifica a app chiusa;
versionamento git del Brain.

---

## 1. Storico sigarette per giorno

### Problema

`Statistiche.tsx` mostra un elenco piatto delle ultime 50 sigarette, senza confini
di giornata. Per sapere cosa è successo martedì bisogna contare a occhio.

### Design

Nuovo modulo puro `src/core/storico.ts`:

```ts
/** Mezzanotte locale del giorno che contiene t. */
export function inizioGiornoLocale(t: number): number;

/** Chiave stabile YYYY-MM-DD nel fuso del dispositivo. */
export function chiaveGiorno(t: number): string;

export interface RiepilogoGiorno {
  sigarette: SigarettaValutata[]; // ordinate dalla più recente
  fumate: number;
  sgarri: number;
  crediti: number;
}

/** Sigarette del giorno indicato, più il riepilogo. */
export function sigaretteDelGiorno(sigarette: SigarettaValutata[], giorno: string): RiepilogoGiorno;
```

`Statistiche.tsx`: la sezione "Storico sigarette" diventa **"Storico del giorno"**.

- Testata: `‹  mer 10 luglio 2026  ›` più un `<input type="date">` per saltare a
  una data qualsiasi.
- Default: oggi.
- La freccia destra è disabilitata quando il giorno mostrato è oggi: non esiste
  futuro da sfogliare.
- La freccia sinistra è sempre attiva. Un giorno prima dell'inizio del piano è
  semplicemente vuoto.
- Riga di riepilogo sotto la testata: `6 fumate · 1 sgarro`. Zero sigarette →
  `Nessuna sigaretta. Giornata pulita.`
- Ogni riga: ora, esito (`regolare` / `sgarro, 22 min di anticipo` / `con
  credito`), pulsante Elimina. Comportamento di Elimina invariato.

La sezione "Giorno per giorno" già presente resta sopra, invariata.

### Test

`src/core/storico.test.ts`
- confine di mezzanotte: una sigaretta alle 23:59 e una alle 00:01 cadono in
  giorni diversi;
- giorno senza sigarette → riepilogo a zero, lista vuota;
- cambio ora legale: il giorno di 23 ore e quello di 25 ore contengono le
  sigarette giuste;
- ordinamento discendente.

`src/ui/Statistiche.dom.test.tsx` (nuovo)
- di default mostra solo le sigarette di oggi;
- la freccia sinistra mostra il giorno prima;
- la freccia destra è disabilitata quando si è su oggi;
- il date picker salta a una data arbitraria.

---

## 2. Badge estesi e mini-obiettivi giornalieri

### Problema

I 10 badge esistenti sono tutti permanenti e lontani (500 € risparmiati, un mese
smoke-free). Nulla dà riscontro nella giornata in corso, che è dove si vince o si
perde.

### 2a. Badge: sei famiglie, ~30 badge

`DatiBadge` si allarga. Tutti i campi restano derivati dai timestamp:

```ts
timerRispettatiDiFila: number;
intervalloCorrenteMin: number;
creditoMax: number;              // massimo credito mai raggiunto
giorniNelPiano: number;
multeVersateEuro: number;
multeVersateCount: number;
notteIntera: boolean;            // una notte 00:00-07:00 senza fumare
giorniPulitiDopoSgarroPesante: number;
obiettiviCentratiDiFila: number; // vedi 2b
```

Famiglie:

| Famiglia | Badge |
|---|---|
| disciplina | 10 / 50 / 100 / 500 timer rispettati di fila |
| resistenza | credito 2/2 raggiunto; intervallo oltre 2h / 6h / 12h / 24h |
| salvadanaio | prima multa versata; 10 / 50 / 100 € versati |
| tempo | 7 / 30 / 100 giorni nel piano |
| notturno | una notte intera senza fumare |
| redenzione | 7 giorni puliti dopo uno sgarro pesante |
| costanza | 7 giorni di fila con entrambi i mini-obiettivi centrati |

I 10 badge esistenti restano, con i loro `id` immutati (le famiglie riduzione,
risparmio, streak, mantenimento). Nessuna migrazione: `badgeSbloccati` è puro,
non c'è nulla di persistito.

`Traguardi.tsx` raggruppa i badge per famiglia sotto sottotitoli e mostra il
conteggio complessivo (`12 / 30`).

### 2b. Mini-obiettivi giornalieri

Nuovo modulo puro `src/core/obiettivi.ts`:

```ts
export type EsitoObiettivo = 'in-corso' | 'riuscito' | 'fallito';

export interface Obiettivo {
  id: string;
  testo: string; // "Nessuno sgarro prima delle 12"
  esito: (g: StatoGiorno, ora: number) => EsitoObiettivo;
}

/** Due obiettivi, scelti dal pool con rotazione deterministica sulla data. */
export function obiettiviDelGiorno(giorno: string): [Obiettivo, Obiettivo];
```

La scelta è deterministica: lo stesso giorno produce sempre gli stessi due
obiettivi, anche dopo una reinstallazione o un ripristino da Drive. Niente
random, niente persistenza, nessuna tabella Dexie nuova, nessuna migrazione.

Pool iniziale (~10): nessuno sgarro prima delle 12; nessuno sgarro in tutta la
giornata; matura almeno un credito; resta sotto il target del giorno; nessuna
sigaretta prima delle 9; almeno un intervallo doppio rispettato; chiudi la
giornata col credito a 2; nessuna sigaretta dopo le 22; versa le multe in
sospeso; nessuna sigaretta nella prima ora dal risveglio (fine finestra notturna).

`esitoObiettivo` è una funzione del solo stato del giorno più l'ora corrente:
`fallito` appena la condizione è violata in modo irreversibile, `riuscito` appena
è definitivamente acquisita, altrimenti `in-corso`. A ogni riapertura dell'app
l'esito si ricalcola da capo dai timestamp: non c'è nulla da salvare.

Dashboard: riquadro compatto a due righe sotto la griglia.

```
○  Nessuno sgarro prima delle 12
✓  Matura un credito
```

`○` in corso, `✓` riuscito, `✗` fallito. Il riquadro non rimpiazza nulla: si
aggiunge sotto la griglia delle schede, sopra il riquadro SOS. Va verificato sul
telefono che la dashboard resti senza scroll.

`StatoGiorno` è un tipo nuovo esposto da `obiettivi.ts`: le sigarette del giorno
(`SigarettaValutata[]`), il target del giorno, il credito corrente e il numero di
sgarri. Si costruisce da `StatoPiano`, non lo sostituisce.

### Test

`src/core/badge.test.ts` — un caso per famiglia nuova, più la soglia esatta di
ogni badge (raggiunto a N, non raggiunto a N−1).

`src/core/obiettivi.test.ts`
- `obiettiviDelGiorno` è deterministico: stessa data → stessi due obiettivi;
- date diverse producono coppie diverse (nessuna coppia costante);
- i due obiettivi di un giorno sono sempre distinti;
- per ogni obiettivo del pool: un caso `riuscito`, uno `fallito`, uno `in-corso`.

`src/ui/Dashboard.dom.test.tsx` — il riquadro mostra due obiettivi con l'icona di
stato corretta.

`src/ui/Traguardi.dom.test.tsx` (nuovo) — i badge sono raggruppati per famiglia,
il conteggio è corretto.

---

## 3. SOS a scenari

### Problema

`craving()` in `Dashboard.tsx` riusa `messaggio('milestone')`: un solo tono, poche
frasi, e nessun legame con la situazione. Nel momento del craving la frase giusta
dipende da cosa sta succedendo.

### Design

Nuovo modulo `src/core/sos.ts`, separato da `messages.ts`.

```ts
export type ScenarioSos =
  | 'mantenimento'
  | 'quasi'
  | 'rimprovero'
  | 'contabile'
  | 'orgoglio'
  | 'incoraggiamento';

export const FRASI_SOS: Record<ScenarioSos, readonly string[]>; // 25 per scenario, 150 totali

export function scenarioSos(s: StatoSos): ScenarioSos;
export function fraseSos(s: StatoSos, seed: number): string;
```

`StatoSos` è un tipo nuovo esposto da `sos.ts`, costruito da ciò che `usePiano`
già espone: mantenimento sì/no, secondi mancanti alla scadenza, sgarri oggi,
euro di multe da versare, streak, ore pulite, euro risparmiati.

`scenarioSos` è pura. **Precedenza, prima che matcha vince:**

1. `mantenimento` — il profilo è in mantenimento
2. `quasi` — mancano 10 minuti o meno alla scadenza del timer
3. `rimprovero` — almeno uno sgarro oggi
4. `contabile` — ci sono multe da versare
5. `orgoglio` — streak di almeno 3 giorni
6. `incoraggiamento` — fallback

`quasi` batte `rimprovero` di proposito. A nove minuti dalla scadenza la cosa
utile è farti aspettare nove minuti, non processarti per un errore già commesso.

Tono per scenario:

- **rimprovero** — severo, dati crudi. "Hai già ceduto una volta oggi. Due?"
- **incoraggiamento** — asciutto, mai sdolcinato. "Stai reggendo. Mancano 34 minuti. Ce la fai."
- **quasi** — urgente, breve. "Nove minuti. Nove. Non ti muovere."
- **contabile** — economico. "Devi già 4,40 €. Vuoi arrivare a 5,50?"
- **orgoglio** — leva sulla streak. "Cinque giorni puliti. Li bruci adesso?"
- **mantenimento** — la posta in gioco. "212 ore. Il conto riparte da capo. Deciditi."

Le frasi contengono segnaposto risolti da `fraseSos` con i numeri reali. In coda
resta sempre la riga di numeri crudi già presente oggi (ore pulite, € risparmiati).

`fraseSos` ruota sul seed come `messaggio()` in `messages.ts`. Nessun ricordo delle
frasi già viste: sarebbe stato nel profilo e non deriverebbe dai timestamp.

`craving()` in `Dashboard.tsx` diventa una chiamata a `fraseSos` con lo stato che
`usePiano` già espone.

### Test

`src/core/sos.test.ts`
- un caso per ogni ramo di precedenza, incluso il conflitto `quasi` vs `rimprovero`
  (entrambi veri → vince `quasi`);
- ogni scenario ha esattamente 25 frasi;
- `fraseSos` è deterministica sul seed;
- i segnaposto sono tutti risolti: nessuna frase restituita contiene `{`.

`src/ui/Dashboard.dom.test.tsx` — premere SOS con uno sgarro oggi mostra una frase
di rimprovero, non di incoraggiamento.

---

## Ordine di implementazione

1. `storico.ts` + `Statistiche.dom.test.tsx` — indipendente, il più piccolo.
2. `sos.ts` + Dashboard — indipendente, molto testo, poca logica.
3. `obiettivi.ts` + riquadro dashboard.
4. `badge.ts` esteso + `Traguardi.tsx` — dipende da 3 per il badge `costanza`.

Ogni passo in TDD: test prima, visto fallire, poi il codice. Le modifiche alla UI
si verificano con test jsdom reali, non solo con la build.

## Verifica finale

`npm test` (157 test attuali, tutti verdi, più i nuovi), `tsc`, `oxlint`. Poi
un giro reale sul telefono: la dashboard deve restare senza scroll con il riquadro
degli obiettivi.
