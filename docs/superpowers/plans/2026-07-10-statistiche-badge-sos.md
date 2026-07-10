# Statistiche per giorno, badge estesi, SOS a scenari — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere a Smoke Timer il filtro per giorno nello storico sigarette, sei famiglie di badge più due mini-obiettivi giornalieri, e un SOS che sceglie il tono in base alla situazione.

**Architecture:** Tre moduli puri nuovi in `src/core/` (`storico.ts`, `sos.ts`, `obiettivi.ts`) più uno che deriva i dati dei badge (`progressi.ts`). Le funzioni sono tutte pure e ricevono `StatoPiano` e `ConfigPiano` già esistenti. Nessuna tabella Dexie nuova, nessuna migrazione, nessun campo nuovo nel profilo: obiettivi e badge si ricalcolano dai timestamp a ogni apertura. La UI (`Statistiche.tsx`, `Dashboard.tsx`, `Traguardi.tsx`) consuma questi moduli tramite l'hook `usePiano` già in uso.

**Tech Stack:** Vite, React 19, TypeScript, Dexie, Vitest (+ jsdom, `@testing-library/react`, `fake-indexeddb`), oxlint.

## Global Constraints

- Lingua di ogni stringa UI: **italiano**. Tono diretto e severo, mai volgare.
- Le stringhe nel codice esistente evitano le lettere accentate (`e` non `è`, `cosi` non `così`). Mantenere la stessa convenzione in ogni frase nuova.
- **Ogni calcolo deriva dai timestamp persistiti.** Nessun `setInterval` o contatore in memoria come fonte di verità. Nessun nuovo stato persistito: né tabelle, né campi di `Profilo`.
- Tutte le funzioni in `src/core/` sono pure e deterministiche. Nessun `Date.now()` dentro `core/`: l'ora corrente arriva sempre come parametro.
- TDD obbligatorio: scrivere il test, vederlo fallire, poi il codice.
- Le modifiche alla UI si verificano con test jsdom reali (`src/ui/*.dom.test.tsx`), non solo con la build.
- Comandi: `npm test` (vitest), `npx tsc --noEmit`, `npx oxlint src`.
- I 157 test esistenti devono restare verdi. Gli `id` dei 10 badge esistenti non cambiano.

## File Structure

| File | Responsabilità |
|------|----------------|
| `src/core/storico.ts` | Confini di giornata in fuso locale; filtro e riepilogo delle sigarette di un giorno. |
| `src/core/sos.ts` | Scenario del craving dedotto dallo stato; 6 set da 25 frasi; risoluzione segnaposto. |
| `src/core/obiettivi.ts` | Pool di mini-obiettivi; scelta deterministica dei due del giorno; esito derivato. |
| `src/core/progressi.ts` | Deriva i campi di `DatiBadge` da `StatoPiano` + `ConfigPiano`. |
| `src/core/badge.ts` | (modificato) `DatiBadge` allargato, ~30 badge in 7 famiglie. |
| `src/ui/Statistiche.tsx` | (modificato) Storico del giorno con navigazione. |
| `src/ui/Dashboard.tsx` | (modificato) Riquadro obiettivi; SOS via `fraseSos`. |
| `src/ui/Traguardi.tsx` | (modificato) Badge raggruppati per famiglia con conteggio. |

---

### Task 1: `core/storico.ts` — confini di giornata

**Files:**
- Create: `src/core/storico.ts`
- Test: `src/core/storico.test.ts`

**Interfaces:**
- Consumes: `SigarettaValutata` da `src/core/engine.ts`.
- Produces:
  - `chiaveGiorno(t: number): string` — `YYYY-MM-DD` locale
  - `inizioGiornoLocale(t: number): number`
  - `giornoPrecedente(giorno: string): string`
  - `giornoSuccessivo(giorno: string): string`
  - `interface RiepilogoGiorno { sigarette: SigarettaValutata[]; fumate: number; sgarri: number; crediti: number }`
  - `sigaretteDelGiorno(sigarette: readonly SigarettaValutata[], giorno: string): RiepilogoGiorno`
  - `etichettaGiorno(giorno: string): string` — `"mer 10 luglio 2026"`

- [ ] **Step 1: Write the failing test**

Crea `src/core/storico.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import type { SigarettaValutata } from './engine';
import {
  chiaveGiorno,
  etichettaGiorno,
  giornoPrecedente,
  giornoSuccessivo,
  inizioGiornoLocale,
  sigaretteDelGiorno,
} from './storico';

function sig(iso: string, extra: Partial<SigarettaValutata> = {}): SigarettaValutata {
  return {
    timestamp: new Date(iso).getTime(),
    giorno: 0,
    sgarro: false,
    usaCredito: false,
    minutiAnticipo: 0,
    multa: 0,
    ...extra,
  };
}

describe('chiaveGiorno', () => {
  test('usa il fuso locale, non UTC', () => {
    expect(chiaveGiorno(new Date('2026-07-10T23:59:00').getTime())).toBe('2026-07-10');
    expect(chiaveGiorno(new Date('2026-07-11T00:01:00').getTime())).toBe('2026-07-11');
  });
});

describe('inizioGiornoLocale', () => {
  test('e la mezzanotte locale del giorno di t', () => {
    const t = new Date('2026-07-10T15:30:00').getTime();
    const atteso = new Date('2026-07-10T00:00:00').getTime();
    expect(inizioGiornoLocale(t)).toBe(atteso);
  });
});

describe('navigazione', () => {
  test('giorno precedente e successivo', () => {
    expect(giornoPrecedente('2026-07-01')).toBe('2026-06-30');
    expect(giornoSuccessivo('2026-12-31')).toBe('2027-01-01');
  });

  test('attraversa il cambio di ora legale senza saltare giorni', () => {
    // In Italia l'ora legale finisce il 25/10/2026: quel giorno dura 25 ore.
    expect(giornoPrecedente('2026-10-26')).toBe('2026-10-25');
    expect(giornoSuccessivo('2026-10-25')).toBe('2026-10-26');
  });
});

describe('sigaretteDelGiorno', () => {
  const elenco = [
    sig('2026-07-09T22:00:00'),
    sig('2026-07-10T08:00:00'),
    sig('2026-07-10T11:00:00', { sgarro: true, minutiAnticipo: 22, multa: 0.55 }),
    sig('2026-07-10T14:00:00', { usaCredito: true }),
    sig('2026-07-11T09:00:00'),
  ];

  test('tiene solo le sigarette del giorno chiesto', () => {
    const r = sigaretteDelGiorno(elenco, '2026-07-10');
    expect(r.fumate).toBe(3);
    expect(r.sgarri).toBe(1);
    expect(r.crediti).toBe(1);
  });

  test('le ordina dalla piu recente', () => {
    const r = sigaretteDelGiorno(elenco, '2026-07-10');
    expect(r.sigarette.map((s) => new Date(s.timestamp).getHours())).toEqual([14, 11, 8]);
  });

  test('un giorno vuoto da un riepilogo a zero', () => {
    const r = sigaretteDelGiorno(elenco, '2026-07-12');
    expect(r).toEqual({ sigarette: [], fumate: 0, sgarri: 0, crediti: 0 });
  });

  test('una sigaretta a mezzanotte in punto appartiene al giorno che inizia', () => {
    const mezzanotte = [sig('2026-07-10T00:00:00')];
    expect(sigaretteDelGiorno(mezzanotte, '2026-07-10').fumate).toBe(1);
    expect(sigaretteDelGiorno(mezzanotte, '2026-07-09').fumate).toBe(0);
  });
});

describe('etichettaGiorno', () => {
  test('formato leggibile in italiano', () => {
    expect(etichettaGiorno('2026-07-10')).toBe('ven 10 luglio 2026');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/core/storico.test.ts`
Expected: FAIL — `Failed to resolve import "./storico"`.

- [ ] **Step 3: Write minimal implementation**

Crea `src/core/storico.ts`:

```ts
import type { SigarettaValutata } from './engine';

/** Mezzanotte locale del giorno che contiene `t`. */
export function inizioGiornoLocale(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Chiave stabile YYYY-MM-DD nel fuso del dispositivo. */
export function chiaveGiorno(t: number): string {
  const d = new Date(t);
  const mese = String(d.getMonth() + 1).padStart(2, '0');
  const giorno = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mese}-${giorno}`;
}

/**
 * Mezzogiorno locale del giorno indicato. Ancorare a mezzogiorno anziche a
 * mezzanotte rende l'aritmetica sui giorni immune al cambio di ora legale:
 * sommare 24 ore a mezzogiorno non fa mai scavallare il giorno sbagliato.
 */
function mezzogiornoDi(giorno: string): Date {
  const [a, m, g] = giorno.split('-').map(Number);
  return new Date(a, m - 1, g, 12, 0, 0, 0);
}

export function giornoPrecedente(giorno: string): string {
  const d = mezzogiornoDi(giorno);
  d.setDate(d.getDate() - 1);
  return chiaveGiorno(d.getTime());
}

export function giornoSuccessivo(giorno: string): string {
  const d = mezzogiornoDi(giorno);
  d.setDate(d.getDate() + 1);
  return chiaveGiorno(d.getTime());
}

export interface RiepilogoGiorno {
  /** Ordinate dalla piu recente. */
  sigarette: SigarettaValutata[];
  fumate: number;
  sgarri: number;
  crediti: number;
}

export function sigaretteDelGiorno(
  sigarette: readonly SigarettaValutata[],
  giorno: string,
): RiepilogoGiorno {
  const delGiorno = sigarette
    .filter((s) => chiaveGiorno(s.timestamp) === giorno)
    .sort((a, b) => b.timestamp - a.timestamp);

  return {
    sigarette: delGiorno,
    fumate: delGiorno.length,
    sgarri: delGiorno.filter((s) => s.sgarro).length,
    crediti: delGiorno.filter((s) => s.usaCredito).length,
  };
}

/** "ven 10 luglio 2026". */
export function etichettaGiorno(giorno: string): string {
  return mezzogiornoDi(giorno).toLocaleDateString('it-IT', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/core/storico.test.ts`
Expected: PASS, 8 test.

Se `etichettaGiorno` fallisce, stampa il valore reale e allinea il test al formato che Node produce per `it-IT` (alcune versioni aggiungono un punto dopo il giorno della settimana). Adegua l'atteso, non la funzione.

- [ ] **Step 5: Commit**

```bash
git add src/core/storico.ts src/core/storico.test.ts
git commit -m "feat: confini di giornata e riepilogo per il filtro storico"
```

---

### Task 2: Statistiche — storico del giorno con navigazione

**Files:**
- Modify: `src/ui/Statistiche.tsx` (sezione "Storico sigarette", righe finali)
- Test: `src/ui/Statistiche.dom.test.tsx` (create)

**Interfaces:**
- Consumes: `chiaveGiorno`, `giornoPrecedente`, `giornoSuccessivo`, `sigaretteDelGiorno`, `etichettaGiorno` da Task 1; `usePiano()` da `src/ui/usePiano.ts`.
- Produces: nulla di importabile.

La testata usa questi accessible name, su cui i test fanno leva: bottoni `Giorno precedente` / `Giorno successivo`, input con label `Vai al giorno`.

- [ ] **Step 1: Write the failing test**

Crea `src/ui/Statistiche.dom.test.tsx`. Nota il pattern del file esistente `Dashboard.dom.test.tsx`: `fake-indexeddb/auto` in cima, fake timers con `shouldAdvanceTime`, `db.delete()` + `db.open()` in `beforeEach`.

```tsx
// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { db } from '../data/db';
import { Statistiche } from './Statistiche';

const OGGI = new Date('2026-07-10T12:00:00').getTime();
const GIORNO = 24 * 60 * 60_000;

beforeEach(async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(OGGI);
  await db.delete();
  await db.open();
  await db.profile.add({
    nome: 'Paolo',
    dataInizio: OGGI - 2 * GIORNO,
    sigaretteAlGiornoIniziali: 20,
    prezzoPacchetto: 5.5,
    incrementoGiornalieroMin: 10,
  });
  // Due sigarette ieri, una oggi.
  await db.smokes.add({ timestamp: new Date('2026-07-09T09:00:00').getTime() });
  await db.smokes.add({ timestamp: new Date('2026-07-09T18:00:00').getTime() });
  await db.smokes.add({ timestamp: new Date('2026-07-10T08:00:00').getTime() });
});

afterEach(async () => {
  cleanup();
  await db.close();
  vi.useRealTimers();
});

describe('storico del giorno', () => {
  test('di default mostra solo il giorno corrente', async () => {
    render(<Statistiche />);
    expect(await screen.findByText('ven 10 luglio 2026')).toBeTruthy();
    expect(screen.getByText('1 fumata, nessuno sgarro')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Elimina' })).toHaveLength(1);
  });

  test('la freccia indietro mostra il giorno prima', async () => {
    render(<Statistiche />);
    await screen.findByText('ven 10 luglio 2026');

    fireEvent.click(screen.getByRole('button', { name: 'Giorno precedente' }));

    expect(screen.getByText('gio 9 luglio 2026')).toBeTruthy();
    expect(screen.getByText('2 fumate, nessuno sgarro')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Elimina' })).toHaveLength(2);
  });

  test('non si puo sfogliare il futuro', async () => {
    render(<Statistiche />);
    await screen.findByText('ven 10 luglio 2026');
    const avanti = screen.getByRole('button', { name: 'Giorno successivo' });
    expect(avanti.hasAttribute('disabled')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Giorno precedente' }));
    expect(screen.getByRole('button', { name: 'Giorno successivo' }).hasAttribute('disabled')).toBe(false);
  });

  test('il date picker salta a una data qualsiasi', async () => {
    render(<Statistiche />);
    await screen.findByText('ven 10 luglio 2026');

    fireEvent.change(screen.getByLabelText('Vai al giorno'), { target: { value: '2026-07-09' } });

    expect(screen.getByText('gio 9 luglio 2026')).toBeTruthy();
  });

  test('un giorno senza sigarette lo dice', async () => {
    render(<Statistiche />);
    await screen.findByText('ven 10 luglio 2026');

    fireEvent.change(screen.getByLabelText('Vai al giorno'), { target: { value: '2026-07-08' } });

    expect(screen.getByText('Nessuna sigaretta. Giornata pulita.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Elimina' })).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/Statistiche.dom.test.tsx`
Expected: FAIL — `Unable to find an element with the text: ven 10 luglio 2026`.

- [ ] **Step 3: Write minimal implementation**

In `src/ui/Statistiche.tsx`, aggiungi gli import:

```tsx
import {
  chiaveGiorno,
  etichettaGiorno,
  giornoPrecedente,
  giornoSuccessivo,
  sigaretteDelGiorno,
} from '../core/storico';
```

Dentro il componente, accanto allo state `retroattiva`, aggiungi:

```tsx
const oggi = chiaveGiorno(Date.now());
const [giornoMostrato, setGiornoMostrato] = useState(oggi);
```

Dopo il calcolo di `report`, aggiungi:

```tsx
const delGiorno = sigaretteDelGiorno(v.stato.sigarette, giornoMostrato);
const riepilogo =
  delGiorno.fumate === 0
    ? 'Nessuna sigaretta. Giornata pulita.'
    : `${delGiorno.fumate} ${delGiorno.fumate === 1 ? 'fumata' : 'fumate'}, ` +
      `${delGiorno.sgarri === 0 ? 'nessuno sgarro' : `${delGiorno.sgarri} sgarri`}`;
```

Sostituisci integralmente la sezione finale `<h2>Storico sigarette</h2>` e la sua `<ul>` con:

```tsx
      <h2 style={{ marginTop: '1.5rem' }}>Storico del giorno</h2>
      <div className="navigatore-giorno">
        <button
          className="pulsante-secondario"
          aria-label="Giorno precedente"
          onClick={() => setGiornoMostrato(giornoPrecedente(giornoMostrato))}
        >
          ‹
        </button>
        <strong>{etichettaGiorno(giornoMostrato)}</strong>
        <button
          className="pulsante-secondario"
          aria-label="Giorno successivo"
          disabled={giornoMostrato >= oggi}
          onClick={() => setGiornoMostrato(giornoSuccessivo(giornoMostrato))}
        >
          ›
        </button>
      </div>
      <label className="campo">
        <span className="campo__etichetta">Vai al giorno</span>
        <input
          className="campo__input"
          type="date"
          max={oggi}
          value={giornoMostrato}
          onChange={(e) => e.target.value && setGiornoMostrato(e.target.value)}
        />
      </label>
      <p className="sottotitolo">{riepilogo}</p>
      <ul>
        {delGiorno.sigarette.map((s) => (
          <li key={s.timestamp}>
            {new Date(s.timestamp).toLocaleTimeString('it-IT', { timeStyle: 'short' })}
            {s.sgarro
              ? ` — sgarro, ${s.minutiAnticipo} min di anticipo`
              : s.usaCredito
                ? ' — con credito'
                : ' — regolare'}{' '}
            <button className="pulsante-secondario" onClick={() => cancella(s.timestamp)}>
              Elimina
            </button>
          </li>
        ))}
      </ul>
```

Il confronto `giornoMostrato >= oggi` funziona perché `YYYY-MM-DD` è ordinabile lessicograficamente.

In `src/index.css`, accoda:

```css
.navigatore-giorno {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ui/Statistiche.dom.test.tsx`
Expected: PASS, 5 test.

Poi la suite intera: `npm test` — Expected: PASS, nessuna regressione.

- [ ] **Step 5: Commit**

```bash
git add src/ui/Statistiche.tsx src/ui/Statistiche.dom.test.tsx src/index.css
git commit -m "feat: lo storico sigarette si sfoglia un giorno alla volta"
```

---

### Task 3: `core/sos.ts` — scenario e precedenza

Le frasi arrivano in Task 4. Qui solo la logica, con set finti nel test.

**Files:**
- Create: `src/core/sos.ts`
- Test: `src/core/sos.test.ts`

**Interfaces:**
- Consumes: nulla.
- Produces:
  - `type ScenarioSos = 'mantenimento' | 'quasi' | 'rimprovero' | 'contabile' | 'orgoglio' | 'incoraggiamento'`
  - `interface StatoSos { mantenimento: boolean; secondiMancanti: number; puoiFumare: boolean; sgarriOggi: number; multeDaVersareEuro: number; streak: number; oreSmokeFree: number; risparmioEuro: number }`
  - `const SOGLIA_QUASI_SEC = 600`
  - `const SOGLIA_ORGOGLIO_GG = 3`
  - `scenarioSos(s: StatoSos): ScenarioSos`

- [ ] **Step 1: Write the failing test**

Crea `src/core/sos.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { scenarioSos, type StatoSos } from './sos';

const BASE: StatoSos = {
  mantenimento: false,
  secondiMancanti: 3600,
  puoiFumare: false,
  sgarriOggi: 0,
  multeDaVersareEuro: 0,
  streak: 0,
  oreSmokeFree: 5,
  risparmioEuro: 12.5,
};

describe('scenarioSos', () => {
  test('mantenimento vince su tutto', () => {
    expect(scenarioSos({ ...BASE, mantenimento: true, sgarriOggi: 3, secondiMancanti: 60 })).toBe('mantenimento');
  });

  test('quasi quando mancano 10 minuti o meno', () => {
    expect(scenarioSos({ ...BASE, secondiMancanti: 600 })).toBe('quasi');
    expect(scenarioSos({ ...BASE, secondiMancanti: 601 })).toBe('incoraggiamento');
  });

  test('quasi batte rimprovero: a nove minuti serve aspettare, non essere processati', () => {
    expect(scenarioSos({ ...BASE, secondiMancanti: 540, sgarriOggi: 2 })).toBe('quasi');
  });

  test('a timer scaduto non e piu quasi: non c e nulla da aspettare', () => {
    expect(scenarioSos({ ...BASE, secondiMancanti: 0, puoiFumare: true })).toBe('incoraggiamento');
  });

  test('rimprovero con almeno uno sgarro oggi', () => {
    expect(scenarioSos({ ...BASE, sgarriOggi: 1, multeDaVersareEuro: 5, streak: 9 })).toBe('rimprovero');
  });

  test('contabile con multe in sospeso e nessuno sgarro oggi', () => {
    expect(scenarioSos({ ...BASE, multeDaVersareEuro: 4.4, streak: 9 })).toBe('contabile');
  });

  test('orgoglio con streak di almeno 3 giorni', () => {
    expect(scenarioSos({ ...BASE, streak: 3 })).toBe('orgoglio');
    expect(scenarioSos({ ...BASE, streak: 2 })).toBe('incoraggiamento');
  });

  test('incoraggiamento come fallback', () => {
    expect(scenarioSos(BASE)).toBe('incoraggiamento');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/core/sos.test.ts`
Expected: FAIL — `Failed to resolve import "./sos"`.

- [ ] **Step 3: Write minimal implementation**

Crea `src/core/sos.ts`:

```ts
export type ScenarioSos =
  | 'mantenimento'
  | 'quasi'
  | 'rimprovero'
  | 'contabile'
  | 'orgoglio'
  | 'incoraggiamento';

/** Tutto cio che serve al SOS, gia derivato dai timestamp da `usePiano`. */
export interface StatoSos {
  mantenimento: boolean;
  secondiMancanti: number;
  puoiFumare: boolean;
  sgarriOggi: number;
  multeDaVersareEuro: number;
  streak: number;
  oreSmokeFree: number;
  risparmioEuro: number;
}

/** Sotto questa soglia il craving si combatte aspettando, non ragionando. */
export const SOGLIA_QUASI_SEC = 600;
export const SOGLIA_ORGOGLIO_GG = 3;

/**
 * Primo che matcha vince. `quasi` precede `rimprovero` di proposito: a nove
 * minuti dalla scadenza la cosa utile e far aspettare nove minuti, non
 * processare l'utente per uno sgarro gia commesso.
 */
export function scenarioSos(s: StatoSos): ScenarioSos {
  if (s.mantenimento) return 'mantenimento';
  if (!s.puoiFumare && s.secondiMancanti > 0 && s.secondiMancanti <= SOGLIA_QUASI_SEC) return 'quasi';
  if (s.sgarriOggi > 0) return 'rimprovero';
  if (s.multeDaVersareEuro > 0) return 'contabile';
  if (s.streak >= SOGLIA_ORGOGLIO_GG) return 'orgoglio';
  return 'incoraggiamento';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/core/sos.test.ts`
Expected: PASS, 8 test.

- [ ] **Step 5: Commit**

```bash
git add src/core/sos.ts src/core/sos.test.ts
git commit -m "feat: lo scenario del SOS si deduce dallo stato del piano"
```

---

### Task 4: `core/sos.ts` — 150 frasi e segnaposto

**Files:**
- Modify: `src/core/sos.ts`
- Test: `src/core/sos.test.ts`

**Interfaces:**
- Consumes: `ScenarioSos`, `StatoSos`, `scenarioSos` da Task 3.
- Produces:
  - `const FRASI_SOS: Record<ScenarioSos, readonly string[]>`
  - `fraseSos(s: StatoSos, seed: number): string`

Segnaposto ammessi: `{minuti}` (minuti mancanti, arrotondati per eccesso), `{ore}` (ore pulite intere), `{euro}` (risparmio, con virgola), `{multe}` (multe da versare, con virgola), `{streak}` (giorni di streak), `{sgarri}` (sgarri oggi).

- [ ] **Step 1: Write the failing test**

Accoda a `src/core/sos.test.ts`:

```ts
import { FRASI_SOS, fraseSos } from './sos';

describe('FRASI_SOS', () => {
  const scenari = [
    'mantenimento',
    'quasi',
    'rimprovero',
    'contabile',
    'orgoglio',
    'incoraggiamento',
  ] as const;

  test('ogni scenario ha 25 frasi', () => {
    for (const s of scenari) expect(FRASI_SOS[s]).toHaveLength(25);
  });

  test('nessuna frase duplicata dentro uno scenario', () => {
    for (const s of scenari) expect(new Set(FRASI_SOS[s]).size).toBe(25);
  });

  test('nessuna lettera accentata, come nel resto dei messaggi', () => {
    for (const s of scenari) {
      for (const f of FRASI_SOS[s]) expect(f).not.toMatch(/[àèéìòù]/);
    }
  });
});

describe('fraseSos', () => {
  test('e deterministica sul seed', () => {
    expect(fraseSos(BASE, 7)).toBe(fraseSos(BASE, 7));
  });

  test('seed diversi pescano frasi diverse', () => {
    const frasi = new Set([0, 1, 2, 3, 4].map((i) => fraseSos(BASE, i)));
    expect(frasi.size).toBeGreaterThan(1);
  });

  test('pesca dallo scenario giusto', () => {
    const f = fraseSos({ ...BASE, sgarriOggi: 1 }, 0);
    expect(FRASI_SOS.rimprovero).toContain(f);
  });

  test('risolve ogni segnaposto: nessuna graffa sopravvive', () => {
    const stati: StatoSos[] = [
      { ...BASE, mantenimento: true },
      { ...BASE, secondiMancanti: 540 },
      { ...BASE, sgarriOggi: 2 },
      { ...BASE, multeDaVersareEuro: 4.4 },
      { ...BASE, streak: 5 },
      BASE,
    ];
    for (const s of stati) {
      for (let seed = 0; seed < 25; seed++) {
        expect(fraseSos(s, seed)).not.toMatch(/[{}]/);
      }
    }
  });

  test('i numeri finiscono davvero nella frase', () => {
    const f = fraseSos({ ...BASE, secondiMancanti: 540 }, 0);
    // 540 s arrotondati per eccesso: 9 minuti.
    expect(FRASI_SOS.quasi[0].replace('{minuti}', '9')).toBe(f);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/core/sos.test.ts`
Expected: FAIL — `FRASI_SOS is not exported` / `fraseSos is not a function`.

- [ ] **Step 3: Write minimal implementation**

Accoda a `src/core/sos.ts`:

```ts
export const FRASI_SOS: Record<ScenarioSos, readonly string[]> = {
  rimprovero: [
    'Hai gia ceduto una volta oggi. Due?',
    'Sgarri oggi: {sgarri}. Ne vuoi un altro sul groppone?',
    'Hai gia rotto il patto stamattina. Non rompilo di nuovo.',
    'La progressione e gia congelata. Non peggiorare.',
    'Domani non migliori comunque. Almeno non aggiungere una multa.',
    'Hai gia pagato per la debolezza di oggi. Basta cosi.',
    'Uno sgarro e un errore. Due e una scelta.',
    'Il salvadanaio ha gia incassato oggi. Non regalargli altro.',
    'Stai per trasformare una giornata storta in una giornata persa.',
    'Hai sbagliato. Capita. Ripetere non capita: si decide.',
    'La streak e gia andata. Salva almeno il resto.',
    'Nessuno ti guarda. Il problema e proprio quello.',
    'Sei tu che hai scritto questo piano. Rispettalo.',
    'Il craving passa in tre minuti. Lo sgarro resta nei dati.',
    'Hai {euro} euro risparmiati. Oggi ne stai bruciando.',
    'Non e stress. E abitudine travestita da stress.',
    'Sei a un passo dal buttare via anche il pomeriggio.',
    'Uno sgarro l hai gia messo a bilancio. Chiudi qui.',
    'Ti stai giustificando mentre leggi. Lo so e lo sai.',
    'Il timer non ha sgarrato. Tu si.',
    'Rileggi il numero degli sgarri di oggi. Poi decidi.',
    'La sigaretta non ripara la giornata. La finisce.',
    'Hai gia perso un round. Non perdere il match.',
    'Non fumare per punirti di aver fumato.',
    'Fermo. Adesso e il momento in cui di solito cedi.',
  ],
  incoraggiamento: [
    'Stai reggendo. Mancano {minuti} minuti. Ce la fai.',
    'Nessuno sgarro oggi. Tienilo cosi.',
    'Il craving dura meno dell attesa. Aspetta.',
    '{minuti} minuti. Li hai gia fatti mille volte.',
    'Giornata pulita finora. Non e poco.',
    'Bevi acqua. Cammina. Torna qui tra cinque minuti.',
    'Non stai rinunciando a niente. Stai riprendendoti qualcosa.',
    'Il corpo sta gia lavorando. Non interromperlo.',
    'Hai {euro} euro che prima erano fumo.',
    'Questo momento passa. La sigaretta invece resta nei dati.',
    'Aspetta {minuti} minuti e la sigaretta te la sei guadagnata.',
    'La voglia sale, tocca il picco, scende. Sei nel picco.',
    'Nessuna multa oggi. Continua a non pagarne.',
    'Non serve volerlo. Serve solo non muoversi.',
    'Il piano funziona solo se lo fai anche adesso.',
    'Sei piu vicino allo zero di quanto pensi.',
    'Nessuno sgarro. Nessun debito. Nessun rimorso.',
    'Il timer scade da solo. Tu no.',
    'Respira. Conta fino a cento. Rileggi questa frase.',
    'Hai gia resistito oggi. Sai come si fa.',
    'Mancano {minuti} minuti a una sigaretta senza sensi di colpa.',
    'Aspettare non e sacrificio. E il piano.',
    'Il fumo non toglie lo stress. Lo rimanda.',
    'Ogni intervallo intero e un mattone. Non toglierlo.',
    'Resisti adesso e stasera la giornata e pulita.',
  ],
  quasi: [
    '{minuti} minuti. Non ti muovere.',
    'Manca cosi poco che sgarrare sarebbe ridicolo.',
    'Sei a {minuti} minuti. Aspetta e non paghi nulla.',
    'Nemmeno il tempo di un caffe. Aspetta.',
    'Ci sei quasi. Non buttare via {minuti} minuti di attesa.',
    'Hai aspettato ore. Adesso molli per {minuti} minuti?',
    'Il timer sta per scadere. Vince la pazienza.',
    'Fermati. Manca meno di quanto ci metti a fumarla.',
    '{minuti} minuti separano una sigaretta regolare da una multa.',
    'Guarda il countdown. E gia quasi finito.',
    'Sarebbe lo sgarro piu stupido possibile. Aspetta.',
    'Ancora {minuti} minuti e nessuno ti dira niente.',
    'Non adesso. Fra {minuti} minuti.',
    'Hai fatto la parte difficile. Questa e la parte facile.',
    'Mettiti a fare altro. Il timer suona da solo.',
    'Sei in fondo all intervallo. Non ricominciare da capo.',
    'Il debito che ti fai adesso lo paghi al prossimo giro.',
    'Meno di dieci minuti. Non e disciplina, e aritmetica.',
    'Aspetta. Poi te la fumi guardando il countdown a zero.',
    '{minuti} minuti al verde. Reggi.',
    'Sgarrare adesso costa quanto sgarrare di un ora. Stessa multa.',
    'Non sprecare tutta l attesa sull ultimo tratto.',
    'Sta finendo. Lascia che finisca.',
    'Il piu e fatto. Non rovinarlo sul traguardo.',
    'Conta fino a {minuti} centinaia. Poi guarda di nuovo.',
  ],
  contabile: [
    'Devi gia {multe} euro al salvadanaio. Vuoi aggiungerne?',
    'Multe da versare: {multe} euro. Non e un numero finto.',
    'Prima versa quello che devi. Poi parliamo di fumare.',
    'Quei {multe} euro sono soldi tuoi bloccati dalla tua debolezza.',
    'Ogni sgarro sono due sigarette pagate e non fumate.',
    'Hai {euro} euro risparmiati e {multe} euro di multe aperte.',
    'Il salvadanaio non dimentica. Aggiungere e facile, versare no.',
    'Sgarrare adesso e comprare una sigaretta a prezzo triplo.',
    'Il conto e aperto. Non ingrossarlo.',
    'Paga il debito prima di farne un altro.',
    'Quei soldi ti serviranno. Non regalarli al tabaccaio due volte.',
    'Multe in sospeso: {multe} euro. Guardale bene.',
    'Fumare ora significa scrivere un altro numero su quella lista.',
    'Il salvadanaio e reale. I soldi escono davvero dal conto.',
    'Non e una penale simbolica. E il tuo stipendio.',
    'Prima di cedere, apri la sezione multe. Poi decidi.',
    'Hai gia trasformato debolezza in {multe} euro. Basta.',
    'Ogni euro di multa e un euro che non hai risparmiato.',
    'Versa i {multe} euro. Ti passera anche la voglia.',
    'Il tuo craving ha un prezzo di listino. Lo conosci.',
    'Fumare in anticipo e il modo piu caro di fumare.',
    'Il salvadanaio cresce solo quando sbagli. Fallo smettere.',
    'Quei {multe} euro erano una cena fuori.',
    'Il debito e gia scritto. Non aggiungere una riga.',
    'Non ti serve una sigaretta. Ti serve versare {multe} euro.',
  ],
  orgoglio: [
    '{streak} giorni puliti. Li bruci adesso?',
    'Streak: {streak} giorni. Vale piu di una sigaretta.',
    'Hai costruito {streak} giorni. Ci vuole un attimo a demolirli.',
    'Nessuno sgarro da {streak} giorni. Nessuno sgarro oggi.',
    '{streak} giorni. Il contatore riparte da uno se cedi.',
    'Guarda la streak. Poi guarda la sigaretta. Non c e partita.',
    'Sei diventato uno che rispetta i tempi. Restalo.',
    '{streak} giorni di disciplina contro tre minuti di voglia.',
    'Il record e li. Superalo, non azzeralo.',
    'Hai {euro} euro e {streak} giorni. Non svenderli.',
    'La streak non e un premio. E la prova che sai farlo.',
    'Chi ha fatto {streak} giorni non cede al giorno {streak}.',
    'Questa voglia l hai gia battuta {streak} volte.',
    'Non sei piu quello di {streak} giorni fa. Comportati come tale.',
    'Un cedimento cancella {streak} giorni dal contatore.',
    'La streak e l unica cosa che il craving non puo toglierti. A meno che.',
    'Stai vincendo. Non e il momento di pareggiare.',
    '{streak} giorni. Domani sono {streak} piu uno. Semplice.',
    'Hai dimostrato di poter aspettare. Aspetta.',
    'La sigaretta ti dara tre minuti. Ti costera {streak} giorni.',
    'Rispetti i tempi da {streak} giorni. Oggi non fa eccezione.',
    'Sei in credito con te stesso. Non prosciugarlo.',
    'Un errore adesso vale piu di tutti i giorni buoni. Al contrario.',
    'Il numero {streak} lo hai scritto tu. Non cancellarlo.',
    'Sarebbe il primo sgarro da {streak} giorni. Fermati.',
  ],
  mantenimento: [
    '{ore} ore pulite. Il conto riparte da capo. Deciditi.',
    'Hai smesso. Una sigaretta non ti rende fumatore. Due si.',
    '{ore} ore. Nessuna di queste te la restituisce nessuno.',
    'Non e una ricompensa. E il primo pacchetto del prossimo anno.',
    '{euro} euro e {ore} ore. Una sigaretta li rimette in gioco.',
    'Il craving in mantenimento e l ultimo colpo di coda. Reggi.',
    'Hai gia fatto la parte impossibile. Questa e memoria, non bisogno.',
    'Una sola non esiste. Lo sai come finisce.',
    'Il corpo ha smesso di chiederlo. E la testa che ricorda.',
    'Sei uno che non fuma. Punto.',
    '{ore} ore di lavoro contro tre minuti di sollievo.',
    'Ricominciare costa mesi. Resistere costa dieci minuti.',
    'La timeline della salute si azzera. Guardala prima di decidere.',
    'Hai attraversato la riduzione intera per arrivare qui.',
    'Nessun ex fumatore ha mai rimpianto di aver resistito.',
    'Quella voglia e un ricordo, non un ordine.',
    '{euro} euro non bruciati. Continua.',
    'Non e stress. E la nicotina che chiede udienza. Negagliela.',
    'Se cedi, domani rileggerai questa frase con vergogna.',
    'Il contatore delle ore pulite e la cosa piu tua che hai.',
    'Ti hanno detto che una non fa niente. Ti hanno mentito.',
    'Sei libero da {ore} ore. La liberta si difende.',
    'La ricaduta si registra e resta nei dati. Per sempre.',
    'Hai gia vinto. Non giocare un altra partita.',
    'Tre minuti. Poi la voglia se ne va e tu sei ancora pulito.',
  ],
};

const formattaNumero = (n: number) => n.toFixed(2).replace('.', ',');

/**
 * Frase del craving: scenario dedotto dallo stato, rotazione deterministica sul
 * seed (di solito il timestamp), segnaposto risolti coi numeri reali.
 */
export function fraseSos(s: StatoSos, seed: number): string {
  const lista = FRASI_SOS[scenarioSos(s)];
  const grezza = lista[Math.abs(Math.trunc(seed)) % lista.length];

  return grezza
    .replaceAll('{minuti}', String(Math.ceil(s.secondiMancanti / 60)))
    .replaceAll('{ore}', String(Math.floor(s.oreSmokeFree)))
    .replaceAll('{euro}', formattaNumero(s.risparmioEuro))
    .replaceAll('{multe}', formattaNumero(s.multeDaVersareEuro))
    .replaceAll('{streak}', String(s.streak))
    .replaceAll('{sgarri}', String(s.sgarriOggi));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/core/sos.test.ts`
Expected: PASS, 15 test.

Se il test "nessuna frase duplicata" fallisce, sostituisci la frase ripetuta con una nuova dello stesso tono — non allentare il test.

`replaceAll` richiede `lib: ES2021` o superiore in `tsconfig`. Verifica con `npx tsc --noEmit`; se protesta, usa `.split(x).join(y)`.

- [ ] **Step 5: Commit**

```bash
git add src/core/sos.ts src/core/sos.test.ts
git commit -m "feat: 150 frasi SOS su sei scenari, con numeri reali"
```

---

### Task 5: Dashboard — SOS a scenari

**Files:**
- Modify: `src/ui/Dashboard.tsx` (funzione `craving`, righe 64-69)
- Test: `src/ui/Dashboard.dom.test.tsx` (append)

**Interfaces:**
- Consumes: `fraseSos`, `FRASI_SOS` da Task 4; `VistaPiano` da `usePiano`.
- Produces: nulla di importabile.

- [ ] **Step 1: Write the failing test**

Accoda a `src/ui/Dashboard.dom.test.tsx`:

```tsx
describe('SOS a scenari', () => {
  test('con uno sgarro oggi rimprovera, non incoraggia', async () => {
    // Sigaretta 5 minuti dopo l'ultima: intervallo 72 min, quindi sgarro pesante.
    await db.smokes.add({ timestamp: ADESSO - 5 * 60_000 });

    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'SOS' }));

    const testo = (await screen.findByText(/./, { selector: '.riepilogo--sos' })).textContent ?? '';
    const rimproveri = FRASI_SOS.rimprovero.map((f) => f.split('{')[0]);
    expect(rimproveri.some((inizio) => testo.includes(inizio))).toBe(true);
  });

  test('senza sgarri e con timer lontano incoraggia', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'SOS' }));

    const testo = (await screen.findByText(/./, { selector: '.riepilogo--sos' })).textContent ?? '';
    const incoraggiamenti = FRASI_SOS.incoraggiamento.map((f) => f.split('{')[0]);
    expect(incoraggiamenti.some((inizio) => testo.includes(inizio))).toBe(true);
  });

  test('la coda coi numeri crudi resta', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'SOS' }));

    const testo = (await screen.findByText(/./, { selector: '.riepilogo--sos' })).textContent ?? '';
    expect(testo).toContain('ore pulite');
    expect(testo).toContain('risparmiati');
  });
});
```

Aggiungi in cima al file: `import { FRASI_SOS } from '../core/sos';`

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/Dashboard.dom.test.tsx`
Expected: FAIL — il primo test fallisce: `craving` usa ancora `messaggio('milestone')`, che non è una frase di rimprovero.

- [ ] **Step 3: Write minimal implementation**

In `src/ui/Dashboard.tsx` aggiungi l'import:

```tsx
import { fraseSos } from '../core/sos';
```

Sostituisci la funzione `craving` (righe 64-69) con:

```tsx
  function craving() {
    const ora = Date.now();
    const frase = fraseSos(
      {
        mantenimento: v.profilo?.mantenimento === true,
        secondiMancanti: v.prossima?.secondiMancanti ?? 0,
        puoiFumare: v.prossima?.puoiFumare ?? true,
        sgarriOggi: v.sgarriOggi,
        multeDaVersareEuro: v.multeDaVersareEuro,
        streak: v.streak,
        oreSmokeFree: v.oreSmokeFree,
        risparmioEuro: v.risparmioEuro,
      },
      ora,
    );
    setSos(
      `${frase} ${Math.floor(v.oreSmokeFree)} ore pulite. ` +
        `${formattaEuro(v.risparmioEuro)} risparmiati.`,
    );
  }
```

Se `messaggio` e `categoriaSgarro` restano usati altrove nel file (lo sono, per il feedback dopo `haFumato`), lascia l'import; altrimenti oxlint segnalerà l'import inutilizzato.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ui/Dashboard.dom.test.tsx`
Expected: PASS.

Poi: `npm test`, `npx tsc --noEmit`, `npx oxlint src` — tutti puliti.

- [ ] **Step 5: Commit**

```bash
git add src/ui/Dashboard.tsx src/ui/Dashboard.dom.test.tsx
git commit -m "feat: il SOS sceglie il tono in base alla situazione"
```

---

### Task 6: `core/obiettivi.ts` — pool e scelta deterministica

**Files:**
- Create: `src/core/obiettivi.ts`
- Test: `src/core/obiettivi.test.ts`

**Interfaces:**
- Consumes: `SigarettaValutata` da `engine.ts`; `chiaveGiorno` da `storico.ts`.
- Produces:
  - `type EsitoObiettivo = 'in-corso' | 'riuscito' | 'fallito'`
  - `interface StatoGiorno { sigarette: readonly SigarettaValutata[]; targetOggi: number; credito: number; fineNotteOra: number }`
  - `interface Obiettivo { id: string; testo: string; esito: (g: StatoGiorno, ora: number) => EsitoObiettivo }`
  - `const POOL_OBIETTIVI: readonly Obiettivo[]`
  - `obiettiviDelGiorno(giorno: string): [Obiettivo, Obiettivo]`

`ora` è un timestamp assoluto; `StatoGiorno.sigarette` contiene **solo** quelle del giorno in questione. `fineNotteOra` è `cfg.notte.fineOra` (default 7).

- [ ] **Step 1: Write the failing test**

Crea `src/core/obiettivi.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import type { SigarettaValutata } from './engine';
import { obiettiviDelGiorno, POOL_OBIETTIVI, type StatoGiorno } from './obiettivi';

function sig(iso: string, extra: Partial<SigarettaValutata> = {}): SigarettaValutata {
  return {
    timestamp: new Date(iso).getTime(),
    giorno: 0,
    sgarro: false,
    usaCredito: false,
    minutiAnticipo: 0,
    multa: 0,
    ...extra,
  };
}

function stato(p: Partial<StatoGiorno> = {}): StatoGiorno {
  return { sigarette: [], targetOggi: 10, credito: 0, fineNotteOra: 7, ...p };
}

const ORA_MATTINA = new Date('2026-07-10T09:00:00').getTime();
const ORA_SERA = new Date('2026-07-10T23:30:00').getTime();

describe('obiettiviDelGiorno', () => {
  test('e deterministica: stesso giorno, stessi obiettivi', () => {
    const a = obiettiviDelGiorno('2026-07-10');
    const b = obiettiviDelGiorno('2026-07-10');
    expect(a.map((o) => o.id)).toEqual(b.map((o) => o.id));
  });

  test('i due obiettivi di un giorno sono distinti', () => {
    for (const g of ['2026-07-10', '2026-07-11', '2026-01-01', '2026-12-31']) {
      const [x, y] = obiettiviDelGiorno(g);
      expect(x.id).not.toBe(y.id);
    }
  });

  test('non e costante: giorni diversi danno coppie diverse', () => {
    const coppie = new Set(
      ['2026-07-10', '2026-07-11', '2026-07-12', '2026-07-13'].map((g) =>
        obiettiviDelGiorno(g)
          .map((o) => o.id)
          .join('+'),
      ),
    );
    expect(coppie.size).toBeGreaterThan(1);
  });

  test('il pool ha almeno 10 obiettivi con id univoci', () => {
    expect(POOL_OBIETTIVI.length).toBeGreaterThanOrEqual(10);
    expect(new Set(POOL_OBIETTIVI.map((o) => o.id)).size).toBe(POOL_OBIETTIVI.length);
  });
});

function esitoDi(id: string, g: StatoGiorno, ora: number) {
  const o = POOL_OBIETTIVI.find((x) => x.id === id);
  if (!o) throw new Error(`obiettivo ${id} assente dal pool`);
  return o.esito(g, ora);
}

describe('niente-sgarri-prima-di-mezzogiorno', () => {
  const id = 'niente-sgarri-mattina';
  test('fallito appena arriva uno sgarro mattutino', () => {
    const g = stato({ sigarette: [sig('2026-07-10T10:00:00', { sgarro: true })] });
    expect(esitoDi(id, g, ORA_MATTINA)).toBe('fallito');
  });
  test('in corso finche e mattina e non ci sono sgarri', () => {
    expect(esitoDi(id, stato(), ORA_MATTINA)).toBe('in-corso');
  });
  test('riuscito dopo mezzogiorno senza sgarri mattutini', () => {
    const g = stato({ sigarette: [sig('2026-07-10T14:00:00', { sgarro: true })] });
    expect(esitoDi(id, g, ORA_SERA)).toBe('riuscito');
  });
});

describe('giornata-senza-sgarri', () => {
  const id = 'giornata-senza-sgarri';
  test('fallito al primo sgarro', () => {
    const g = stato({ sigarette: [sig('2026-07-10T10:00:00', { sgarro: true })] });
    expect(esitoDi(id, g, ORA_MATTINA)).toBe('fallito');
  });
  test('in corso a giornata aperta', () => {
    expect(esitoDi(id, stato(), ORA_MATTINA)).toBe('in-corso');
  });
  test('riuscito a giornata finita', () => {
    const mezzanotte = new Date('2026-07-11T00:00:00').getTime();
    expect(esitoDi(id, stato(), mezzanotte)).toBe('riuscito');
  });
});

describe('matura-un-credito', () => {
  const id = 'matura-un-credito';
  test('riuscito col credito disponibile', () => {
    expect(esitoDi(id, stato({ credito: 1 }), ORA_MATTINA)).toBe('riuscito');
  });
  test('riuscito anche se il credito e gia stato speso', () => {
    const g = stato({ sigarette: [sig('2026-07-10T10:00:00', { usaCredito: true })] });
    expect(esitoDi(id, g, ORA_MATTINA)).toBe('riuscito');
  });
  test('in corso senza credito, a giornata aperta', () => {
    expect(esitoDi(id, stato(), ORA_MATTINA)).toBe('in-corso');
  });
  test('fallito a giornata finita senza credito', () => {
    const mezzanotte = new Date('2026-07-11T00:00:00').getTime();
    expect(esitoDi(id, stato(), mezzanotte)).toBe('fallito');
  });
});

describe('sotto-il-target', () => {
  const id = 'sotto-il-target';
  test('fallito appena si supera il target', () => {
    const g = stato({ targetOggi: 2, sigarette: [sig('2026-07-10T08:00:00'), sig('2026-07-10T09:00:00')] });
    expect(esitoDi(id, g, ORA_MATTINA)).toBe('fallito');
  });
  test('in corso sotto il target a giornata aperta', () => {
    expect(esitoDi(id, stato({ targetOggi: 5 }), ORA_MATTINA)).toBe('in-corso');
  });
  test('riuscito a giornata finita sotto il target', () => {
    const mezzanotte = new Date('2026-07-11T00:00:00').getTime();
    expect(esitoDi(id, stato({ targetOggi: 5 }), mezzanotte)).toBe('riuscito');
  });
});

describe('niente-fumo-prima-delle-nove', () => {
  const id = 'niente-fumo-prima-delle-nove';
  test('fallito con una sigaretta alle 8', () => {
    const g = stato({ sigarette: [sig('2026-07-10T08:00:00')] });
    expect(esitoDi(id, g, ORA_MATTINA)).toBe('fallito');
  });
  test('riuscito dalle 9 in poi se nessuna prima', () => {
    expect(esitoDi(id, stato(), ORA_MATTINA)).toBe('riuscito');
  });
  test('in corso prima delle 9', () => {
    const alba = new Date('2026-07-10T07:30:00').getTime();
    expect(esitoDi(id, stato(), alba)).toBe('in-corso');
  });
});

describe('niente-fumo-dopo-le-22', () => {
  const id = 'niente-fumo-dopo-le-22';
  test('fallito con una sigaretta alle 23', () => {
    const g = stato({ sigarette: [sig('2026-07-10T23:00:00')] });
    expect(esitoDi(id, g, ORA_SERA)).toBe('fallito');
  });
  test('in corso durante il giorno', () => {
    expect(esitoDi(id, stato(), ORA_MATTINA)).toBe('in-corso');
  });
  test('riuscito a mezzanotte senza sigarette serali', () => {
    const mezzanotte = new Date('2026-07-11T00:00:00').getTime();
    expect(esitoDi(id, stato(), mezzanotte)).toBe('riuscito');
  });
});

describe('meta-del-target', () => {
  const id = 'meta-del-target';
  test('fallito superata la meta del target', () => {
    const g = stato({ targetOggi: 4, sigarette: [sig('2026-07-10T08:00:00'), sig('2026-07-10T09:00:00')] });
    expect(esitoDi(id, g, ORA_MATTINA)).toBe('fallito');
  });
  test('in corso sotto la meta', () => {
    expect(esitoDi(id, stato({ targetOggi: 4 }), ORA_MATTINA)).toBe('in-corso');
  });
  test('riuscito a giornata finita', () => {
    const mezzanotte = new Date('2026-07-11T00:00:00').getTime();
    expect(esitoDi(id, stato({ targetOggi: 4 }), mezzanotte)).toBe('riuscito');
  });
});

describe('nessuna-sigaretta-col-credito', () => {
  const id = 'nessuna-sigaretta-col-credito';
  test('fallito se una sigaretta consuma il credito', () => {
    const g = stato({ sigarette: [sig('2026-07-10T10:00:00', { usaCredito: true })] });
    expect(esitoDi(id, g, ORA_MATTINA)).toBe('fallito');
  });
  test('in corso a giornata aperta', () => {
    expect(esitoDi(id, stato(), ORA_MATTINA)).toBe('in-corso');
  });
  test('riuscito a mezzanotte', () => {
    const mezzanotte = new Date('2026-07-11T00:00:00').getTime();
    expect(esitoDi(id, stato(), mezzanotte)).toBe('riuscito');
  });
});

describe('prima-ora-sveglio-pulita', () => {
  const id = 'prima-ora-sveglio-pulita';
  test('fallito fumando entro un ora dalla fine della notte', () => {
    const g = stato({ sigarette: [sig('2026-07-10T07:30:00')] });
    expect(esitoDi(id, g, ORA_MATTINA)).toBe('fallito');
  });
  test('riuscito passata quell ora', () => {
    expect(esitoDi(id, stato(), ORA_MATTINA)).toBe('riuscito');
  });
  test('in corso dentro la finestra', () => {
    const presto = new Date('2026-07-10T07:20:00').getTime();
    expect(esitoDi(id, stato(), presto)).toBe('in-corso');
  });
});

describe('credito-pieno-a-fine-giornata', () => {
  const id = 'credito-pieno-a-fine-giornata';
  test('riuscito col credito a 2', () => {
    expect(esitoDi(id, stato({ credito: 2 }), ORA_SERA)).toBe('riuscito');
  });
  test('in corso col credito basso a giornata aperta', () => {
    expect(esitoDi(id, stato({ credito: 0 }), ORA_MATTINA)).toBe('in-corso');
  });
  test('fallito a mezzanotte col credito basso', () => {
    const mezzanotte = new Date('2026-07-11T00:00:00').getTime();
    expect(esitoDi(id, stato({ credito: 1 }), mezzanotte)).toBe('fallito');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/core/obiettivi.test.ts`
Expected: FAIL — `Failed to resolve import "./obiettivi"`.

- [ ] **Step 3: Write minimal implementation**

Crea `src/core/obiettivi.ts`:

```ts
import type { SigarettaValutata } from './engine';
import { CREDITO_MAX } from './credit';

export type EsitoObiettivo = 'in-corso' | 'riuscito' | 'fallito';

/** Solo le sigarette del giorno in esame, piu il contesto che serve a valutarlo. */
export interface StatoGiorno {
  sigarette: readonly SigarettaValutata[];
  targetOggi: number;
  credito: number;
  /** Ora locale in cui finisce la finestra notturna: `cfg.notte.fineOra`. */
  fineNotteOra: number;
}

export interface Obiettivo {
  id: string;
  testo: string;
  esito: (g: StatoGiorno, ora: number) => EsitoObiettivo;
}

const oraDi = (t: number) => new Date(t).getHours();

/** La giornata e finita quando `ora` e passata alla data successiva. */
function giornoFinito(g: StatoGiorno, ora: number): boolean {
  const riferimento = g.sigarette[0]?.timestamp ?? ora;
  const fine = new Date(riferimento);
  fine.setHours(24, 0, 0, 0);
  return ora >= fine.getTime();
}

/**
 * Obiettivo che si puo solo perdere: finche la condizione regge e la giornata e
 * aperta resta in corso, a mezzanotte diventa riuscito.
 */
function daDifendere(violato: (g: StatoGiorno) => boolean): Obiettivo['esito'] {
  return (g, ora) => {
    if (violato(g)) return 'fallito';
    return giornoFinito(g, ora) ? 'riuscito' : 'in-corso';
  };
}

/**
 * Obiettivo che si puo solo conquistare: appena la condizione e vera e riuscito,
 * a mezzanotte senza averla raggiunta e fallito.
 */
function daConquistare(raggiunto: (g: StatoGiorno) => boolean): Obiettivo['esito'] {
  return (g, ora) => {
    if (raggiunto(g)) return 'riuscito';
    return giornoFinito(g, ora) ? 'fallito' : 'in-corso';
  };
}

/** Obiettivo con una scadenza intraday: superata l'ora limite senza violazioni, e vinto. */
function entroLOra(oraLimite: (g: StatoGiorno) => number, violato: (g: StatoGiorno) => boolean): Obiettivo['esito'] {
  return (g, ora) => {
    if (violato(g)) return 'fallito';
    return oraDi(ora) >= oraLimite(g) ? 'riuscito' : 'in-corso';
  };
}

export const POOL_OBIETTIVI: readonly Obiettivo[] = [
  {
    id: 'niente-sgarri-mattina',
    testo: 'Nessuno sgarro prima di mezzogiorno',
    esito: entroLOra(
      () => 12,
      (g) => g.sigarette.some((s) => s.sgarro && oraDi(s.timestamp) < 12),
    ),
  },
  {
    id: 'giornata-senza-sgarri',
    testo: 'Nessuno sgarro in tutta la giornata',
    esito: daDifendere((g) => g.sigarette.some((s) => s.sgarro)),
  },
  {
    id: 'matura-un-credito',
    testo: 'Matura almeno un credito',
    esito: daConquistare((g) => g.credito >= 1 || g.sigarette.some((s) => s.usaCredito)),
  },
  {
    id: 'sotto-il-target',
    testo: 'Resta sotto il target del giorno',
    esito: daDifendere((g) => g.sigarette.length > g.targetOggi),
  },
  {
    id: 'meta-del-target',
    testo: 'Fermati a meta del target',
    esito: daDifendere((g) => g.sigarette.length > Math.floor(g.targetOggi / 2)),
  },
  {
    id: 'niente-fumo-prima-delle-nove',
    testo: 'Nessuna sigaretta prima delle 9',
    esito: entroLOra(
      () => 9,
      (g) => g.sigarette.some((s) => oraDi(s.timestamp) < 9),
    ),
  },
  {
    id: 'niente-fumo-dopo-le-22',
    testo: 'Nessuna sigaretta dopo le 22',
    esito: daDifendere((g) => g.sigarette.some((s) => oraDi(s.timestamp) >= 22)),
  },
  {
    id: 'nessuna-sigaretta-col-credito',
    testo: 'Non spendere il credito',
    esito: daDifendere((g) => g.sigarette.some((s) => s.usaCredito)),
  },
  {
    id: 'prima-ora-sveglio-pulita',
    testo: 'Nessuna sigaretta nella prima ora di sveglia',
    esito: entroLOra(
      (g) => g.fineNotteOra + 1,
      (g) => g.sigarette.some((s) => oraDi(s.timestamp) < g.fineNotteOra + 1),
    ),
  },
  {
    id: 'credito-pieno-a-fine-giornata',
    testo: 'Chiudi la giornata col credito pieno',
    esito: daConquistare((g) => g.credito >= CREDITO_MAX),
  },
];

/** Somma dei caratteri della data: deterministica, stabile fra reinstallazioni. */
function semeGiorno(giorno: string): number {
  let n = 0;
  for (const c of giorno) n = (n * 31 + c.charCodeAt(0)) >>> 0;
  return n;
}

/**
 * I due obiettivi del giorno. Deterministici sulla data: la stessa giornata
 * produce sempre la stessa coppia, anche dopo un ripristino da Drive. Nessun
 * random, nessuna persistenza.
 */
export function obiettiviDelGiorno(giorno: string): [Obiettivo, Obiettivo] {
  const seme = semeGiorno(giorno);
  const n = POOL_OBIETTIVI.length;
  const primo = seme % n;
  // Passo coprimo con n: garantisce secondo != primo per qualunque seme.
  const secondo = (primo + 1 + (Math.trunc(seme / n) % (n - 1))) % n;
  return [POOL_OBIETTIVI[primo], POOL_OBIETTIVI[secondo]];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/core/obiettivi.test.ts`
Expected: PASS.

Se "non e costante" fallisce (quattro date consecutive che danno la stessa coppia), il moltiplicatore del seme è troppo debole: sostituisci `n * 31 + c.charCodeAt(0)` con `n * 131 + c.charCodeAt(0)` e rilancia. Non toccare i test.

- [ ] **Step 5: Commit**

```bash
git add src/core/obiettivi.ts src/core/obiettivi.test.ts
git commit -m "feat: due mini-obiettivi al giorno, deterministici e derivati"
```

---

### Task 7: Dashboard — riquadro dei mini-obiettivi

**Files:**
- Modify: `src/ui/Dashboard.tsx` (dopo il blocco `<div className="griglia">`)
- Modify: `src/index.css`
- Test: `src/ui/Dashboard.dom.test.tsx` (append)

**Interfaces:**
- Consumes: `obiettiviDelGiorno`, `StatoGiorno`, `EsitoObiettivo` da Task 6; `chiaveGiorno`, `sigaretteDelGiorno` da Task 1.
- Produces: nulla di importabile.

Il riquadro va **sotto** la griglia delle schede e **sopra** il riquadro SOS. Icone: `○` in corso, `✓` riuscito, `✗` fallito. Ogni riga ha `aria-label` = `"<testo>: <esito>"`.

- [ ] **Step 1: Write the failing test**

Accoda a `src/ui/Dashboard.dom.test.tsx`:

```tsx
describe('mini-obiettivi in dashboard', () => {
  test('mostra esattamente due obiettivi del giorno', async () => {
    render(<App />);
    await screen.findByText('Obiettivi di oggi');
    expect(screen.getAllByRole('listitem', { name: /: (in corso|riuscito|fallito)$/ })).toHaveLength(2);
  });

  test('gli obiettivi mostrati sono quelli deterministici della data', async () => {
    render(<App />);
    await screen.findByText('Obiettivi di oggi');
    for (const o of obiettiviDelGiorno(chiaveGiorno(ADESSO))) {
      expect(screen.getByText(o.testo)).toBeTruthy();
    }
  });

  test('un obiettivo violato risulta fallito', async () => {
    // Sigaretta in forte anticipo: sgarro alle 12:00, quindi mattina rovinata.
    await db.smokes.add({ timestamp: ADESSO - 60_000 });

    render(<App />);
    await screen.findByText('Obiettivi di oggi');

    const falliti = screen.queryAllByRole('listitem', { name: /: fallito$/ });
    const senzaSgarri = falliti.some((li) => (li.textContent ?? '').includes('sgarro'));
    // Almeno uno degli obiettivi sugli sgarri, se estratto oggi, deve risultare fallito.
    const estrattiSugliSgarri = obiettiviDelGiorno(chiaveGiorno(ADESSO)).some((o) => o.testo.includes('sgarro'));
    expect(senzaSgarri).toBe(estrattiSugliSgarri);
  });
});
```

Aggiungi in cima al file: `import { obiettiviDelGiorno } from '../core/obiettivi';` e `import { chiaveGiorno } from '../core/storico';`

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/Dashboard.dom.test.tsx`
Expected: FAIL — `Unable to find an element with the text: Obiettivi di oggi`.

- [ ] **Step 3: Write minimal implementation**

In `src/ui/Dashboard.tsx` aggiungi gli import:

```tsx
import { obiettiviDelGiorno, type EsitoObiettivo } from '../core/obiettivi';
import { chiaveGiorno, sigaretteDelGiorno } from '../core/storico';
```

Dopo il calcolo di `targetOggi`, aggiungi:

```tsx
  const oggiChiave = chiaveGiorno(v.ora);
  const statoGiorno = {
    sigarette: sigaretteDelGiorno(stato.sigarette, oggiChiave).sigarette,
    targetOggi,
    credito: prossima.credito,
    fineNotteOra: cfg.notte.fineOra,
  };
  const obiettivi = obiettiviDelGiorno(oggiChiave).map((o) => ({
    testo: o.testo,
    esito: o.esito(statoGiorno, v.ora),
  }));
```

Subito dopo la chiusura di `<div className="griglia">` e prima della riga `{sos && ...}`, inserisci:

```tsx
      <h2 className="obiettivi__titolo">Obiettivi di oggi</h2>
      <ul className="obiettivi">
        {obiettivi.map((o) => (
          <li key={o.testo} className={`obiettivo obiettivo--${o.esito}`} aria-label={`${o.testo}: ${etichettaEsito(o.esito)}`}>
            <span aria-hidden="true">{ICONA_ESITO[o.esito]}</span> {o.testo}
          </li>
        ))}
      </ul>
```

In fondo al file, accanto a `riepilogoGiornata`, aggiungi:

```tsx
const ICONA_ESITO: Record<EsitoObiettivo, string> = {
  'in-corso': '○',
  riuscito: '✓',
  fallito: '✗',
};

function etichettaEsito(e: EsitoObiettivo): string {
  return e === 'in-corso' ? 'in corso' : e;
}
```

In `src/index.css`, accoda:

```css
.obiettivi__titolo {
  font-size: 0.9rem;
  margin: 1rem 0 0.25rem;
  opacity: 0.7;
}

.obiettivi {
  list-style: none;
  margin: 0;
  padding: 0;
}

.obiettivo {
  font-size: 0.9rem;
  padding: 0.15rem 0;
  opacity: 0.75;
}

.obiettivo--riuscito {
  color: var(--verde);
  opacity: 1;
}

.obiettivo--fallito {
  color: var(--rosso);
  opacity: 1;
  text-decoration: line-through;
}
```

Se `--rosso` non esiste in `index.css`, usa il colore già impiegato da `.scheda--allarme`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ui/Dashboard.dom.test.tsx`
Expected: PASS.

Poi `npm test` intero, `npx tsc --noEmit`, `npx oxlint src`.

- [ ] **Step 5: Verifica visiva reale**

Run: `npm run dev`, apri il browser in vista mobile (390×844, un Pixel medio).
Expected: la dashboard resta **senza scroll** col riquadro obiettivi. Se scrolla, riduci `.obiettivo` a `font-size: 0.85rem` e `padding: 0.1rem 0`. Se ancora scrolla, fermati e segnalalo: è una decisione di prodotto, non tecnica.

- [ ] **Step 6: Commit**

```bash
git add src/ui/Dashboard.tsx src/ui/Dashboard.dom.test.tsx src/index.css
git commit -m "feat: due mini-obiettivi visibili in dashboard"
```

---

### Task 8: `core/progressi.ts` — dati derivati per i badge

**Files:**
- Create: `src/core/progressi.ts`
- Test: `src/core/progressi.test.ts`

**Interfaces:**
- Consumes: `StatoPiano`, `ConfigPiano`, `giornoDiPiano` da `engine.ts`; `chiaveGiorno` da `storico.ts`; `SOGLIA_SGARRO_PESANTE_MIN` da `messages.ts`.
- Produces:
  - `timerRispettatiDiFila(stato: StatoPiano): number`
  - `notteIntera(stato: StatoPiano, cfg: ConfigPiano): boolean`
  - `giorniPulitiDopoSgarroPesante(stato: StatoPiano, giornoCorrente: number): number`
  - `giorniNelPiano(cfg: ConfigPiano, ora: number): number`

`timerRispettatiDiFila` conta, dalla fine, le sigarette consecutive con `sgarro === false` (una sigaretta col credito conta come rispettata: non è uno sgarro).

`notteIntera`: esiste almeno una data in cui nessuna sigaretta cade nella finestra `[notte.inizioOra, notte.fineOra)`, e ci sono sigarette sia il giorno prima che il giorno dopo (altrimenti "nessuna sigaretta di notte" sarebbe vero anche per notti prima dell'inizio del piano).

- [ ] **Step 1: Write the failing test**

Crea `src/core/progressi.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { valutaSigarette, type ConfigPiano } from './engine';
import { FINESTRA_DEFAULT } from './nightWindow';
import {
  giorniNelPiano,
  giorniPulitiDopoSgarroPesante,
  notteIntera,
  timerRispettatiDiFila,
} from './progressi';

const INIZIO = new Date('2026-07-01T00:00:00').getTime();
const MIN = 60_000;

const CFG: ConfigPiano = {
  intervalloBaseMin: 60,
  incrementoGiornalieroMin: 10,
  notte: FINESTRA_DEFAULT,
  multaPerSgarro: 0.55,
  inizioPiano: INIZIO,
  pause: [],
};

const t = (iso: string) => new Date(iso).getTime();

describe('timerRispettatiDiFila', () => {
  test('conta le sigarette regolari consecutive dalla fine', () => {
    const stato = valutaSigarette(
      [
        t('2026-07-01T08:00:00'),
        t('2026-07-01T08:30:00'), // sgarro: 30 min invece di 60
        t('2026-07-01T10:00:00'),
        t('2026-07-01T12:00:00'),
      ],
      CFG,
    );
    expect(timerRispettatiDiFila(stato)).toBe(2);
  });

  test('lo sgarro in coda azzera il conteggio', () => {
    const stato = valutaSigarette([t('2026-07-01T08:00:00'), t('2026-07-01T08:10:00')], CFG);
    expect(timerRispettatiDiFila(stato)).toBe(0);
  });

  test('zero sigarette, zero timer rispettati', () => {
    expect(timerRispettatiDiFila(valutaSigarette([], CFG))).toBe(0);
  });
});

describe('notteIntera', () => {
  test('vera se una notte fra due giorni fumati e pulita', () => {
    const stato = valutaSigarette([t('2026-07-01T22:00:00'), t('2026-07-02T09:00:00')], CFG);
    expect(notteIntera(stato, CFG)).toBe(true);
  });

  test('falsa se ha fumato alle 3 di notte', () => {
    const stato = valutaSigarette(
      [t('2026-07-01T22:00:00'), t('2026-07-02T03:00:00'), t('2026-07-02T09:00:00')],
      CFG,
    );
    expect(notteIntera(stato, CFG)).toBe(false);
  });

  test('falsa con una sola giornata di dati', () => {
    const stato = valutaSigarette([t('2026-07-01T22:00:00')], CFG);
    expect(notteIntera(stato, CFG)).toBe(false);
  });
});

describe('giorniPulitiDopoSgarroPesante', () => {
  test('conta i giorni senza sgarri dopo l ultimo sgarro pesante', () => {
    const stato = valutaSigarette(
      [
        t('2026-07-01T08:00:00'),
        t('2026-07-01T08:05:00'), // 55 min di anticipo: pesante
        t('2026-07-02T12:00:00'),
        t('2026-07-03T12:00:00'),
      ],
      CFG,
    );
    // Giorno corrente = 3 (04/07): puliti i giorni 1, 2 e 3.
    expect(giorniPulitiDopoSgarroPesante(stato, 3)).toBe(3);
  });

  test('zero senza sgarri pesanti nello storico', () => {
    const stato = valutaSigarette([t('2026-07-01T08:00:00'), t('2026-07-01T09:00:00')], CFG);
    expect(giorniPulitiDopoSgarroPesante(stato, 3)).toBe(0);
  });

  test('uno sgarro dopo quello pesante riazzera', () => {
    const stato = valutaSigarette(
      [
        t('2026-07-01T08:00:00'),
        t('2026-07-01T08:05:00'), // pesante
        t('2026-07-02T12:00:00'),
        t('2026-07-02T12:10:00'), // sgarro lieve? no: 60 min di intervallo, 50 di anticipo
      ],
      CFG,
    );
    expect(giorniPulitiDopoSgarroPesante(stato, 2)).toBe(0);
  });
});

describe('giorniNelPiano', () => {
  test('il primo giorno vale 1', () => {
    expect(giorniNelPiano(CFG, t('2026-07-01T23:00:00'))).toBe(1);
  });
  test('cresce di uno al giorno', () => {
    expect(giorniNelPiano(CFG, t('2026-07-10T00:30:00'))).toBe(10);
  });
});
```

Se `giorniPulitiDopoSgarroPesante` con "uno sgarro dopo quello pesante" non risulta 0 perché la seconda sigaretta del giorno 2 non è classificata sgarro (il debito maggiora l'intervallo), stampa `stato.sigarette` e correggi i timestamp del test finché lo sgarro c'è davvero. Il comportamento atteso — un qualunque sgarro successivo azzera — non cambia.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/core/progressi.test.ts`
Expected: FAIL — `Failed to resolve import "./progressi"`.

- [ ] **Step 3: Write minimal implementation**

Crea `src/core/progressi.ts`:

```ts
import { giornoDiPiano, type ConfigPiano, type StatoPiano } from './engine';
import { SOGLIA_SGARRO_PESANTE_MIN } from './messages';
import { chiaveGiorno } from './storico';

/** Sigarette consecutive senza sgarro, contate dall'ultima all'indietro. */
export function timerRispettatiDiFila(stato: StatoPiano): number {
  let n = 0;
  for (let i = stato.sigarette.length - 1; i >= 0; i--) {
    if (stato.sigarette[i].sgarro) break;
    n++;
  }
  return n;
}

const oraDi = (t: number) => new Date(t).getHours();

/**
 * Almeno una notte attraversata senza fumare, fra due giorni in cui ha fumato.
 * Il vincolo sui due giorni evita di premiare le notti precedenti al piano.
 */
export function notteIntera(stato: StatoPiano, cfg: ConfigPiano): boolean {
  const giorni = [...new Set(stato.sigarette.map((s) => chiaveGiorno(s.timestamp)))].sort();
  if (giorni.length < 2) return false;

  const dentroLaNotte = (t: number) => {
    const h = oraDi(t);
    return h >= cfg.notte.inizioOra && h < cfg.notte.fineOra;
  };

  // Una notte "appartiene" al giorno in cui finisce: quella del 2 luglio va da
  // mezzanotte del 2 alle 7 del 2. Basta che uno dei giorni successivi al primo
  // non abbia sigarette nella propria finestra notturna.
  return giorni
    .slice(1)
    .some((g) => !stato.sigarette.some((s) => chiaveGiorno(s.timestamp) === g && dentroLaNotte(s.timestamp)));
}

/** Giorni consecutivi senza sgarri dall ultimo sgarro pesante a oggi. Zero se non ce n e mai stato uno. */
export function giorniPulitiDopoSgarroPesante(stato: StatoPiano, giornoCorrente: number): number {
  const pesanti = stato.sigarette.filter((s) => s.sgarro && s.minutiAnticipo >= SOGLIA_SGARRO_PESANTE_MIN);
  if (pesanti.length === 0) return 0;

  const giornoPesante = pesanti[pesanti.length - 1].giorno;
  const sgarriDopo = stato.sigarette.filter((s) => s.sgarro && s.giorno > giornoPesante);
  if (sgarriDopo.length > 0) return 0;

  return Math.max(0, giornoCorrente - giornoPesante);
}

/** Giorni di piano trascorsi, primo giorno incluso. */
export function giorniNelPiano(cfg: ConfigPiano, ora: number): number {
  return giornoDiPiano(ora, cfg.inizioPiano) + 1;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/core/progressi.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/progressi.ts src/core/progressi.test.ts
git commit -m "feat: dati derivati per le nuove famiglie di badge"
```

---

### Task 9: badge — sette famiglie, ~30 badge

**Files:**
- Modify: `src/core/badge.ts`
- Test: `src/core/badge.test.ts`

**Interfaces:**
- Consumes: nulla di nuovo (i valori arrivano già calcolati in `DatiBadge`).
- Produces:
  - `type FamigliaBadge = 'riduzione' | 'streak' | 'risparmio' | 'mantenimento' | 'disciplina' | 'resistenza' | 'salvadanaio' | 'tempo' | 'notturno' | 'redenzione' | 'costanza'`
  - `interface Badge { id; titolo; descrizione; famiglia: FamigliaBadge; raggiunto: (d: DatiBadge) => boolean }`
  - `DatiBadge` allargato
  - `badgeSbloccati(d: DatiBadge): Badge[]` (invariata)
  - `const ETICHETTA_FAMIGLIA: Record<FamigliaBadge, string>`

Gli `id` dei 10 badge esistenti restano identici.

- [ ] **Step 1: Write the failing test**

Sostituisci `src/core/badge.test.ts` con:

```ts
import { describe, expect, test } from 'vitest';
import { BADGE, badgeSbloccati, ETICHETTA_FAMIGLIA, type DatiBadge } from './badge';

const ZERO: DatiBadge = {
  giorniPuliti: 0,
  streakMax: 0,
  risparmioEuro: 0,
  sigaretteOggi: 20,
  sigaretteAlGiornoIniziali: 20,
  oreSmokeFree: 0,
  timerRispettatiDiFila: 0,
  intervalloCorrenteMin: 72,
  creditoMax: 0,
  giorniNelPiano: 1,
  multeVersateEuro: 0,
  multeVersateCount: 0,
  notteIntera: false,
  giorniPulitiDopoSgarroPesante: 0,
  obiettiviCentratiDiFila: 0,
};

function sbloccato(id: string, d: Partial<DatiBadge>): boolean {
  return badgeSbloccati({ ...ZERO, ...d }).some((b) => b.id === id);
}

describe('struttura', () => {
  test('gli id sono univoci', () => {
    expect(new Set(BADGE.map((b) => b.id)).size).toBe(BADGE.length);
  });

  test('almeno 30 badge', () => {
    expect(BADGE.length).toBeGreaterThanOrEqual(30);
  });

  test('gli id storici non sono cambiati', () => {
    const storici = [
      'primo-giorno-pulito',
      'settimana-pulita',
      'meno-25',
      'meno-50',
      'meno-75',
      'risparmio-50',
      'risparmio-100',
      'risparmio-500',
      'primo-giorno-zero',
      'mese-smoke-free',
    ];
    for (const id of storici) expect(BADGE.some((b) => b.id === id)).toBe(true);
  });

  test('ogni famiglia usata ha un etichetta', () => {
    for (const b of BADGE) expect(ETICHETTA_FAMIGLIA[b.famiglia]).toBeTruthy();
  });

  test('con dati a zero nessun badge e sbloccato', () => {
    expect(badgeSbloccati(ZERO)).toEqual([]);
  });
});

describe('disciplina', () => {
  test('scatta alla soglia esatta, non prima', () => {
    expect(sbloccato('disciplina-10', { timerRispettatiDiFila: 9 })).toBe(false);
    expect(sbloccato('disciplina-10', { timerRispettatiDiFila: 10 })).toBe(true);
    expect(sbloccato('disciplina-500', { timerRispettatiDiFila: 499 })).toBe(false);
    expect(sbloccato('disciplina-500', { timerRispettatiDiFila: 500 })).toBe(true);
  });
});

describe('resistenza', () => {
  test('credito pieno', () => {
    expect(sbloccato('credito-pieno', { creditoMax: 1 })).toBe(false);
    expect(sbloccato('credito-pieno', { creditoMax: 2 })).toBe(true);
  });

  test('intervallo oltre le soglie', () => {
    expect(sbloccato('intervallo-2h', { intervalloCorrenteMin: 119 })).toBe(false);
    expect(sbloccato('intervallo-2h', { intervalloCorrenteMin: 120 })).toBe(true);
    expect(sbloccato('intervallo-24h', { intervalloCorrenteMin: 1440 })).toBe(true);
  });
});

describe('salvadanaio', () => {
  test('prima multa versata', () => {
    expect(sbloccato('prima-multa-versata', { multeVersateCount: 1 })).toBe(true);
    expect(sbloccato('prima-multa-versata', { multeVersateCount: 0 })).toBe(false);
  });

  test('soglie in euro versati', () => {
    expect(sbloccato('versati-10', { multeVersateEuro: 9.99 })).toBe(false);
    expect(sbloccato('versati-10', { multeVersateEuro: 10 })).toBe(true);
    expect(sbloccato('versati-100', { multeVersateEuro: 100 })).toBe(true);
  });
});

describe('tempo', () => {
  test('giorni nel piano', () => {
    expect(sbloccato('piano-7', { giorniNelPiano: 6 })).toBe(false);
    expect(sbloccato('piano-7', { giorniNelPiano: 7 })).toBe(true);
    expect(sbloccato('piano-100', { giorniNelPiano: 100 })).toBe(true);
  });
});

describe('notturno e redenzione', () => {
  test('una notte intera', () => {
    expect(sbloccato('notte-intera', { notteIntera: true })).toBe(true);
  });

  test('sette giorni puliti dopo uno sgarro pesante', () => {
    expect(sbloccato('redenzione', { giorniPulitiDopoSgarroPesante: 6 })).toBe(false);
    expect(sbloccato('redenzione', { giorniPulitiDopoSgarroPesante: 7 })).toBe(true);
  });
});

describe('costanza', () => {
  test('sette giorni con entrambi gli obiettivi centrati', () => {
    expect(sbloccato('costanza-7', { obiettiviCentratiDiFila: 6 })).toBe(false);
    expect(sbloccato('costanza-7', { obiettiviCentratiDiFila: 7 })).toBe(true);
  });
});

describe('badge storici', () => {
  test('la riduzione usa le sigarette di oggi contro le iniziali', () => {
    expect(sbloccato('meno-50', { sigaretteOggi: 10, sigaretteAlGiornoIniziali: 20 })).toBe(true);
    expect(sbloccato('meno-75', { sigaretteOggi: 10, sigaretteAlGiornoIniziali: 20 })).toBe(false);
  });

  test('mese smoke free a 30 giorni', () => {
    expect(sbloccato('mese-smoke-free', { oreSmokeFree: 24 * 30 })).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/core/badge.test.ts`
Expected: FAIL — `ETICHETTA_FAMIGLIA is not exported`, e i campi nuovi di `DatiBadge` non esistono.

- [ ] **Step 3: Write minimal implementation**

Sostituisci `src/core/badge.ts` con:

```ts
export type FamigliaBadge =
  | 'riduzione'
  | 'streak'
  | 'risparmio'
  | 'mantenimento'
  | 'disciplina'
  | 'resistenza'
  | 'salvadanaio'
  | 'tempo'
  | 'notturno'
  | 'redenzione'
  | 'costanza';

export const ETICHETTA_FAMIGLIA: Record<FamigliaBadge, string> = {
  riduzione: 'Riduzione',
  streak: 'Streak',
  risparmio: 'Risparmio',
  mantenimento: 'Mantenimento',
  disciplina: 'Disciplina',
  resistenza: 'Resistenza',
  salvadanaio: 'Salvadanaio',
  tempo: 'Tempo',
  notturno: 'Notte',
  redenzione: 'Redenzione',
  costanza: 'Costanza',
};

export interface DatiBadge {
  giorniPuliti: number;
  streakMax: number;
  risparmioEuro: number;
  sigaretteOggi: number;
  sigaretteAlGiornoIniziali: number;
  oreSmokeFree: number;
  /** Sigarette consecutive senza sgarro. */
  timerRispettatiDiFila: number;
  intervalloCorrenteMin: number;
  /** Massimo credito raggiunto finora. */
  creditoMax: number;
  giorniNelPiano: number;
  multeVersateEuro: number;
  multeVersateCount: number;
  notteIntera: boolean;
  giorniPulitiDopoSgarroPesante: number;
  /** Giorni di fila con entrambi i mini-obiettivi centrati. */
  obiettiviCentratiDiFila: number;
}

export interface Badge {
  id: string;
  titolo: string;
  descrizione: string;
  famiglia: FamigliaBadge;
  raggiunto: (d: DatiBadge) => boolean;
}

const riduzione = (d: DatiBadge) => 1 - d.sigaretteOggi / d.sigaretteAlGiornoIniziali;

export const BADGE: readonly Badge[] = [
  // Riduzione
  {
    id: 'meno-25',
    titolo: '−25%',
    descrizione: 'Un quarto delle sigarette in meno rispetto all inizio.',
    famiglia: 'riduzione',
    raggiunto: (d) => riduzione(d) >= 0.25,
  },
  {
    id: 'meno-50',
    titolo: '−50%',
    descrizione: 'Meta delle sigarette rispetto all inizio.',
    famiglia: 'riduzione',
    raggiunto: (d) => riduzione(d) >= 0.5,
  },
  {
    id: 'meno-75',
    titolo: '−75%',
    descrizione: 'Tre quarti in meno. Lo zero e vicino.',
    famiglia: 'riduzione',
    raggiunto: (d) => riduzione(d) >= 0.75,
  },

  // Streak
  {
    id: 'primo-giorno-pulito',
    titolo: 'Prima giornata senza sgarri',
    descrizione: 'Un giorno intero rispettando ogni timer.',
    famiglia: 'streak',
    raggiunto: (d) => d.giorniPuliti >= 1,
  },
  {
    id: 'settimana-pulita',
    titolo: 'Una settimana pulita',
    descrizione: '7 giorni di fila senza un solo sgarro.',
    famiglia: 'streak',
    raggiunto: (d) => d.streakMax >= 7,
  },
  {
    id: 'streak-30',
    titolo: 'Un mese pulito',
    descrizione: '30 giorni di fila senza sgarri.',
    famiglia: 'streak',
    raggiunto: (d) => d.streakMax >= 30,
  },

  // Risparmio
  {
    id: 'risparmio-50',
    titolo: '50 € risparmiati',
    descrizione: 'Soldi non bruciati.',
    famiglia: 'risparmio',
    raggiunto: (d) => d.risparmioEuro >= 50,
  },
  {
    id: 'risparmio-100',
    titolo: '100 € risparmiati',
    descrizione: 'Il conto inizia a vedersi.',
    famiglia: 'risparmio',
    raggiunto: (d) => d.risparmioEuro >= 100,
  },
  {
    id: 'risparmio-500',
    titolo: '500 € risparmiati',
    descrizione: 'Mezzo migliaio che era fumo.',
    famiglia: 'risparmio',
    raggiunto: (d) => d.risparmioEuro >= 500,
  },
  {
    id: 'risparmio-1000',
    titolo: '1000 € risparmiati',
    descrizione: 'Quattro cifre. Non erano tue, ora si.',
    famiglia: 'risparmio',
    raggiunto: (d) => d.risparmioEuro >= 1000,
  },

  // Mantenimento
  {
    id: 'primo-giorno-zero',
    titolo: 'Primo giorno a zero sigarette',
    descrizione: '24 ore senza fumare, nemmeno una.',
    famiglia: 'mantenimento',
    raggiunto: (d) => d.oreSmokeFree >= 24,
  },
  {
    id: 'settimana-smoke-free',
    titolo: 'Una settimana smoke-free',
    descrizione: '7 giorni senza fumare.',
    famiglia: 'mantenimento',
    raggiunto: (d) => d.oreSmokeFree >= 24 * 7,
  },
  {
    id: 'mese-smoke-free',
    titolo: 'Un mese smoke-free',
    descrizione: '30 giorni senza fumare.',
    famiglia: 'mantenimento',
    raggiunto: (d) => d.oreSmokeFree >= 24 * 30,
  },
  {
    id: 'anno-smoke-free',
    titolo: 'Un anno smoke-free',
    descrizione: '365 giorni. Il rischio cardiaco e dimezzato.',
    famiglia: 'mantenimento',
    raggiunto: (d) => d.oreSmokeFree >= 24 * 365,
  },

  // Disciplina
  {
    id: 'disciplina-10',
    titolo: '10 timer di fila',
    descrizione: 'Dieci sigarette consecutive senza rubare un minuto.',
    famiglia: 'disciplina',
    raggiunto: (d) => d.timerRispettatiDiFila >= 10,
  },
  {
    id: 'disciplina-50',
    titolo: '50 timer di fila',
    descrizione: 'Cinquanta. Non e piu fortuna.',
    famiglia: 'disciplina',
    raggiunto: (d) => d.timerRispettatiDiFila >= 50,
  },
  {
    id: 'disciplina-100',
    titolo: '100 timer di fila',
    descrizione: 'Cento intervalli interi. Il piano sei tu.',
    famiglia: 'disciplina',
    raggiunto: (d) => d.timerRispettatiDiFila >= 100,
  },
  {
    id: 'disciplina-500',
    titolo: '500 timer di fila',
    descrizione: 'Cinquecento. Nessuna scusa in mezzo.',
    famiglia: 'disciplina',
    raggiunto: (d) => d.timerRispettatiDiFila >= 500,
  },

  // Resistenza
  {
    id: 'credito-pieno',
    titolo: 'Credito pieno',
    descrizione: 'Due sigarette in credito. Hai aspettato il doppio.',
    famiglia: 'resistenza',
    raggiunto: (d) => d.creditoMax >= 2,
  },
  {
    id: 'intervallo-2h',
    titolo: 'Due ore di intervallo',
    descrizione: 'Il timer supera le due ore.',
    famiglia: 'resistenza',
    raggiunto: (d) => d.intervalloCorrenteMin >= 120,
  },
  {
    id: 'intervallo-6h',
    titolo: 'Sei ore di intervallo',
    descrizione: 'Un quarto di giornata fra una sigaretta e l altra.',
    famiglia: 'resistenza',
    raggiunto: (d) => d.intervalloCorrenteMin >= 360,
  },
  {
    id: 'intervallo-12h',
    titolo: 'Dodici ore di intervallo',
    descrizione: 'Mezza giornata. Due sigarette al giorno.',
    famiglia: 'resistenza',
    raggiunto: (d) => d.intervalloCorrenteMin >= 720,
  },
  {
    id: 'intervallo-24h',
    titolo: 'Ventiquattro ore di intervallo',
    descrizione: 'Una sigaretta al giorno. Lo zero e a un passo.',
    famiglia: 'resistenza',
    raggiunto: (d) => d.intervalloCorrenteMin >= 1440,
  },

  // Salvadanaio
  {
    id: 'prima-multa-versata',
    titolo: 'Prima multa versata',
    descrizione: 'Hai pagato davvero. Il salvadanaio e reale.',
    famiglia: 'salvadanaio',
    raggiunto: (d) => d.multeVersateCount >= 1,
  },
  {
    id: 'versati-10',
    titolo: '10 € versati',
    descrizione: 'Dieci euro di debolezza, messi da parte.',
    famiglia: 'salvadanaio',
    raggiunto: (d) => d.multeVersateEuro >= 10,
  },
  {
    id: 'versati-50',
    titolo: '50 € versati',
    descrizione: 'Un fondo vero, costruito sbagliando.',
    famiglia: 'salvadanaio',
    raggiunto: (d) => d.multeVersateEuro >= 50,
  },
  {
    id: 'versati-100',
    titolo: '100 € versati',
    descrizione: 'Cento euro. Ora falli smettere di crescere.',
    famiglia: 'salvadanaio',
    raggiunto: (d) => d.multeVersateEuro >= 100,
  },

  // Tempo
  {
    id: 'piano-7',
    titolo: 'Una settimana di piano',
    descrizione: 'Sette giorni dentro il programma.',
    famiglia: 'tempo',
    raggiunto: (d) => d.giorniNelPiano >= 7,
  },
  {
    id: 'piano-30',
    titolo: 'Un mese di piano',
    descrizione: 'Trenta giorni. Non hai mollato.',
    famiglia: 'tempo',
    raggiunto: (d) => d.giorniNelPiano >= 30,
  },
  {
    id: 'piano-100',
    titolo: 'Cento giorni di piano',
    descrizione: 'Cento giorni con il timer addosso.',
    famiglia: 'tempo',
    raggiunto: (d) => d.giorniNelPiano >= 100,
  },

  // Notturno
  {
    id: 'notte-intera',
    titolo: 'Notte intera',
    descrizione: 'Una notte attraversata senza accendere niente.',
    famiglia: 'notturno',
    raggiunto: (d) => d.notteIntera,
  },

  // Redenzione
  {
    id: 'redenzione',
    titolo: 'Redenzione',
    descrizione: 'Sette giorni puliti dopo uno sgarro pesante.',
    famiglia: 'redenzione',
    raggiunto: (d) => d.giorniPulitiDopoSgarroPesante >= 7,
  },

  // Costanza
  {
    id: 'costanza-7',
    titolo: 'Sette giorni di obiettivi',
    descrizione: 'Una settimana centrando entrambi i mini-obiettivi.',
    famiglia: 'costanza',
    raggiunto: (d) => d.obiettiviCentratiDiFila >= 7,
  },
];

export function badgeSbloccati(d: DatiBadge): Badge[] {
  return BADGE.filter((b) => b.raggiunto(d));
}
```

Nota: `ZERO` nei test ha `sigaretteOggi: 20` e `sigaretteAlGiornoIniziali: 20`, quindi `riduzione` vale 0 e nessun badge riduzione scatta. `intervalloCorrenteMin: 72` è sotto ogni soglia di resistenza. È così che "con dati a zero nessun badge è sbloccato" passa.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/core/badge.test.ts`
Expected: PASS.

Poi `npx tsc --noEmit`: fallirà in `src/ui/Traguardi.tsx`, che costruisce un `DatiBadge` senza i campi nuovi. È atteso — lo sistema il Task 10. Non committare finché tsc non è pulito: fai i Task 9 e 10 e committa alla fine del 10.

- [ ] **Step 5: Nessun commit qui**

Il codice non compila finché Traguardi non è aggiornato. Prosegui col Task 10.

---

### Task 10: Traguardi — badge raggruppati per famiglia

**Files:**
- Modify: `src/ui/Traguardi.tsx`
- Modify: `src/ui/usePiano.ts` (espone i dati nuovi)
- Test: `src/ui/Traguardi.dom.test.tsx` (create)

**Interfaces:**
- Consumes: `BADGE`, `ETICHETTA_FAMIGLIA`, `DatiBadge`, `FamigliaBadge` da Task 9; `timerRispettatiDiFila`, `notteIntera`, `giorniPulitiDopoSgarroPesante`, `giorniNelPiano` da Task 8; `obiettiviDelGiorno` da Task 6.
- Produces: `VistaPiano.datiBadge: DatiBadge` da `usePiano`.

`creditoMax` e `obiettiviCentratiDiFila` richiedono di ripercorrere lo storico. Per contenere lo scope:

- `creditoMax`: il massimo fra il credito corrente e `2` se esiste almeno una sigaretta con `usaCredito` preceduta da un'altra con `usaCredito` senza sigarette in mezzo (due crediti consumati di seguito ⇒ il credito era pieno). Altrimenti il credito corrente.
- `obiettiviCentratiDiFila`: si valuta solo sui **giorni chiusi**, ricostruendo per ogni data lo `StatoGiorno` da `stato.sigarette` e valutando gli obiettivi a mezzanotte del giorno dopo. Il credito storico non è ricostruibile a costo ragionevole: passa `credito: 0`. Gli obiettivi che dipendono dal credito risulteranno falliti nei giorni passati, e il badge `costanza-7` sarà quindi conservativo — mai regalato. Documentalo nel codice.

- [ ] **Step 1: Write the failing test**

Crea `src/ui/Traguardi.dom.test.tsx`:

```tsx
// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { BADGE } from '../core/badge';
import { db } from '../data/db';
import { Traguardi } from './Traguardi';

const ADESSO = new Date('2026-07-10T12:00:00').getTime();

beforeEach(async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(ADESSO);
  await db.delete();
  await db.open();
  await db.profile.add({
    nome: 'Paolo',
    dataInizio: ADESSO,
    sigaretteAlGiornoIniziali: 20,
    prezzoPacchetto: 5.5,
    incrementoGiornalieroMin: 10,
  });
  await db.smokes.add({ timestamp: ADESSO - 10 * 60_000 });
});

afterEach(async () => {
  cleanup();
  await db.close();
  vi.useRealTimers();
});

describe('Traguardi', () => {
  test('mostra il conteggio dei badge sbloccati sul totale', async () => {
    render(<Traguardi />);
    expect(await screen.findByText(new RegExp(`/ ${BADGE.length}`))).toBeTruthy();
  });

  test('raggruppa i badge per famiglia', async () => {
    render(<Traguardi />);
    await screen.findByText('Badge');
    for (const etichetta of ['Disciplina', 'Resistenza', 'Salvadanaio', 'Notte', 'Redenzione']) {
      expect(screen.getByText(etichetta)).toBeTruthy();
    }
  });

  test('elenca ogni badge esistente', async () => {
    render(<Traguardi />);
    await screen.findByText('Badge');
    for (const b of BADGE) expect(screen.getByText(b.titolo)).toBeTruthy();
  });

  test('a inizio piano nessun badge e sbloccato', async () => {
    render(<Traguardi />);
    expect(await screen.findByText(`0 / ${BADGE.length}`)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/Traguardi.dom.test.tsx`
Expected: FAIL — `Unable to find an element with the text: Disciplina`.

- [ ] **Step 3: Write minimal implementation**

**3a.** In `src/ui/usePiano.ts`, aggiungi gli import:

```ts
import type { DatiBadge } from '../core/badge';
import { obiettiviDelGiorno, type StatoGiorno } from '../core/obiettivi';
import { giorniNelPiano, giorniPulitiDopoSgarroPesante, notteIntera, timerRispettatiDiFila } from '../core/progressi';
import { chiaveGiorno, sigaretteDelGiorno } from '../core/storico';
import { intervalloGiorno } from '../core/interval';
```

Aggiungi `datiBadge?: DatiBadge;` all'interfaccia `VistaPiano`.

Prima del `return` finale, aggiungi:

```ts
  const intervalloCorrenteMin = intervalloGiorno(
    giornoCorrente,
    cfg.intervalloBaseMin,
    cfg.incrementoGiornalieroMin,
    stato.giorniCongelati,
  );
  const prossima = prossimaSigaretta(stato, cfg, ora);
  const versate = (multeVersate ?? []);

  const datiBadge: DatiBadge = {
    giorniPuliti: streakSenzaSgarri(stato, giornoCorrente),
    streakMax: streakMassima(stato, giornoCorrente),
    risparmioEuro: risparmioCalcolato,
    sigaretteOggi: diOggi.length,
    sigaretteAlGiornoIniziali: profilo.sigaretteAlGiornoIniziali,
    oreSmokeFree: oreSmokeFreeCalcolate,
    timerRispettatiDiFila: timerRispettatiDiFila(stato),
    intervalloCorrenteMin,
    creditoMax: creditoMassimo(stato, prossima.credito),
    giorniNelPiano: giorniNelPiano(cfg, ora),
    multeVersateEuro: versate.reduce((n, m) => n + m.importo, 0),
    multeVersateCount: versate.length,
    notteIntera: notteIntera(stato, cfg),
    giorniPulitiDopoSgarroPesante: giorniPulitiDopoSgarroPesante(stato, giornoCorrente),
    obiettiviCentratiDiFila: obiettiviCentratiDiFila(stato, cfg, ora),
  };
```

Estrai `risparmioCalcolato`, `oreSmokeFreeCalcolate` e `prossima` in variabili prima del `return`, e riusale sia dentro `datiBadge` sia nel `return` (oggi sono calcolate inline: evita di calcolarle due volte). Aggiungi la query delle multe versate accanto a quella esistente:

```ts
  const multeVersate = useLiveQuery(() => db.penalties.where('stato').equals('versata').toArray(), []);
```

Poi aggiungi `datiBadge` all'oggetto restituito.

In fondo a `usePiano.ts`, aggiungi le due funzioni ausiliarie:

```ts
/**
 * Il credito massimo mai raggiunto. Due sigarette consecutive entrambe a credito
 * provano che il credito era pieno: e l'unica traccia che i timestamp lasciano.
 */
function creditoMassimo(stato: StatoPiano, creditoOra: number): number {
  const s = stato.sigarette;
  for (let i = 1; i < s.length; i++) {
    if (s[i].usaCredito && s[i - 1].usaCredito) return CREDITO_MAX;
  }
  return creditoOra;
}

/**
 * Giorni chiusi consecutivi, a ritroso da ieri, in cui entrambi i mini-obiettivi
 * sono riusciti. Il credito storico non e ricostruibile a costo ragionevole:
 * si passa 0, quindi gli obiettivi che dipendono dal credito risultano falliti
 * nei giorni passati. Il badge resta conservativo: mai regalato.
 */
function obiettiviCentratiDiFila(stato: StatoPiano, cfg: ConfigPiano, ora: number): number {
  let n = 0;
  for (let indietro = 1; indietro <= 400; indietro++) {
    const giorno = new Date(ora);
    giorno.setHours(12, 0, 0, 0);
    giorno.setDate(giorno.getDate() - indietro);
    const chiave = chiaveGiorno(giorno.getTime());

    const delGiorno = sigaretteDelGiorno(stato.sigarette, chiave);
    if (delGiorno.fumate === 0) break;

    const giornoPiano = giornoDiPiano(giorno.getTime(), cfg.inizioPiano);
    const g: StatoGiorno = {
      sigarette: delGiorno.sigarette,
      targetOggi: Math.max(
        0,
        Math.floor(
          1440 /
            intervalloGiorno(giornoPiano, cfg.intervalloBaseMin, cfg.incrementoGiornalieroMin, stato.giorniCongelati),
        ),
      ),
      credito: 0,
      fineNotteOra: cfg.notte.fineOra,
    };

    const mezzanotteDopo = new Date(giorno);
    mezzanotteDopo.setHours(24, 0, 0, 0);
    const tuttiRiusciti = obiettiviDelGiorno(chiave).every(
      (o) => o.esito(g, mezzanotteDopo.getTime()) === 'riuscito',
    );
    if (!tuttiRiusciti) break;
    n++;
  }
  return n;
}
```

Aggiungi gli import mancanti in cima: `import { CREDITO_MAX } from '../core/credit';` e `giornoDiPiano` da `engine`.

**3b.** Sostituisci `src/ui/Traguardi.tsx` con:

```tsx
import { BADGE, ETICHETTA_FAMIGLIA, type FamigliaBadge } from '../core/badge';
import { TIMELINE_SALUTE, beneficiSbloccati, prossimoBeneficio } from '../core/salute';
import { usePiano } from './usePiano';

const ORDINE_FAMIGLIE: FamigliaBadge[] = [
  'streak',
  'disciplina',
  'costanza',
  'riduzione',
  'resistenza',
  'notturno',
  'redenzione',
  'risparmio',
  'salvadanaio',
  'tempo',
  'mantenimento',
];

export function Traguardi() {
  const v = usePiano();

  if (v.caricamento || !v.profilo || !v.datiBadge) return null;

  const dati = v.datiBadge;
  const sbloccati = new Set(BADGE.filter((b) => b.raggiunto(dati)).map((b) => b.id));
  const beneficiOk = new Set(beneficiSbloccati(v.oreSmokeFree).map((b) => b.id));
  const prossimo = prossimoBeneficio(v.oreSmokeFree);

  return (
    <main>
      <h1 className="saluto">Traguardi</h1>
      <p className="sottotitolo">
        Streak record: {v.streakMax} giorni. Ore senza fumare: {Math.floor(v.oreSmokeFree)}.
      </p>

      <h2 style={{ marginTop: '1.5rem' }}>Badge</h2>
      <p className="sottotitolo">
        {sbloccati.size} / {BADGE.length}
      </p>

      {ORDINE_FAMIGLIE.map((famiglia) => {
        const delGruppo = BADGE.filter((b) => b.famiglia === famiglia);
        if (delGruppo.length === 0) return null;
        return (
          <section key={famiglia}>
            <h3>{ETICHETTA_FAMIGLIA[famiglia]}</h3>
            <ul>
              {delGruppo.map((b) => (
                <li key={b.id} style={{ color: sbloccati.has(b.id) ? 'var(--verde)' : undefined }}>
                  {sbloccati.has(b.id) ? '✓' : '·'} <strong>{b.titolo}</strong> — {b.descrizione}
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <h2 style={{ marginTop: '1.5rem' }}>Salute</h2>
      <p className="sottotitolo">
        {prossimo
          ? `Prossimo beneficio a ${prossimo.quando} senza fumare: ${prossimo.testo}`
          : 'Timeline completa. Un anno pulito.'}
      </p>
      <ul>
        {TIMELINE_SALUTE.map((b) => (
          <li key={b.id} style={{ color: beneficiOk.has(b.id) ? 'var(--verde)' : undefined }}>
            {beneficiOk.has(b.id) ? '✓' : '·'} <strong>{b.quando}</strong> — {b.testo}
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ui/Traguardi.dom.test.tsx`
Expected: PASS.

Poi tutto: `npm test` (157 + i nuovi, tutti verdi), `npx tsc --noEmit` (pulito), `npx oxlint src` (pulito).

Se `screen.getByText(b.titolo)` fallisce su `−25%` per via del segno meno tipografico, il test sta usando la stringa esatta di `BADGE`, quindi combacia. Se fallisce, il badge è duplicato in due famiglie: correggi `badge.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/core/badge.ts src/core/badge.test.ts src/ui/Traguardi.tsx src/ui/Traguardi.dom.test.tsx src/ui/usePiano.ts
git commit -m "feat: trenta badge in sette famiglie, raggruppati in Traguardi"
```

---

### Task 11: Verifica finale e integrazione

**Files:** nessuno nuovo.

- [ ] **Step 1: Suite completa**

Run:
```bash
npm test
npx tsc --noEmit
npx oxlint src
npm run build
```
Expected: test tutti verdi, tsc silenzioso, oxlint silenzioso, build riuscita.

- [ ] **Step 2: Giro reale in browser**

Run: `npm run dev`, vista mobile 390×844.

Controlla, uno per uno:
1. Dashboard senza scroll verticale, con il riquadro dei due obiettivi visibile.
2. SOS premuto due volte di seguito: la frase cambia (il seed è `Date.now()`).
3. SOS dopo aver registrato uno sgarro: il tono diventa di rimprovero.
4. Statistiche → Storico del giorno: la freccia indietro mostra ieri, avanti è disabilitata su oggi, il date picker salta.
5. Traguardi: i badge sono raggruppati, il conteggio in cima è coerente.

- [ ] **Step 3: Commit finale e merge**

Se qualcosa nel giro reale non torna, correggi e ricommitta prima di procedere.

```bash
git add -A
git commit -m "chore: verifica finale statistiche, badge e SOS"
```

Poi usa la skill `superpowers:finishing-a-development-branch` per decidere come integrare il branch `feat/statistiche-badge-sos`.
