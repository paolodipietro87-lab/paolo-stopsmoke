import Dexie, { type EntityTable } from 'dexie';
import type { FinestraNotturna } from '../core/nightWindow';

export interface Profilo {
  id?: number;
  nome: string;
  dataInizio: number;
  sigaretteAlGiornoIniziali: number;
  /** Prezzo di un pacchetto da 20. */
  prezzoPacchetto: number;
  incrementoGiornalieroMin: number;
  marca?: string;
  notte?: FinestraNotturna;
  /** Se assente: costo di 2 sigarette. */
  multaPerSgarro?: number;
  /** Deep link dell'app bancaria per il salvadanaio. */
  linkBanca?: string;
  mantenimento?: boolean;
}

export interface Sigaretta {
  id?: number;
  timestamp: number;
}

export interface Acquisto {
  id?: number;
  timestamp: number;
  numeroPacchetti: number;
  prezzoTotale: number;
}

export type StatoMulta = 'da_versare' | 'versata';

export interface Multa {
  id?: number;
  timestamp: number;
  importo: number;
  motivo: string;
  stato: StatoMulta;
  dataVersamento?: number;
  /** Sigaretta che ha generato la multa: serve per l'undo. */
  sigarettaId?: number;
}

export interface PausaRecord {
  id?: number;
  dataInizio: number;
  dataFine?: number;
}

const SIGARETTE_PER_PACCHETTO = 20;

class SmokeTimerDB extends Dexie {
  profile!: EntityTable<Profilo, 'id'>;
  smokes!: EntityTable<Sigaretta, 'id'>;
  purchases!: EntityTable<Acquisto, 'id'>;
  penalties!: EntityTable<Multa, 'id'>;
  pauses!: EntityTable<PausaRecord, 'id'>;

  constructor() {
    super('smoke-timer');
    this.version(1).stores({
      profile: '++id',
      smokes: '++id, timestamp',
      purchases: '++id, timestamp',
      penalties: '++id, timestamp, stato, sigarettaId',
      pauses: '++id, dataInizio',
    });
  }
}

export const db = new SmokeTimerDB();

export async function salvaProfilo(p: Profilo): Promise<void> {
  const esistente = await leggiProfilo();
  await db.profile.put({ ...p, id: esistente?.id ?? 1 });
}

/**
 * null = onboarding non fatto. Non undefined: chi legge con useLiveQuery usa
 * undefined per "sto ancora caricando", e i due casi non vanno confusi.
 */
export async function leggiProfilo(): Promise<Profilo | null> {
  return (await db.profile.toCollection().first()) ?? null;
}

export async function registraSigaretta(timestamp: number): Promise<number> {
  return (await db.smokes.add({ timestamp })) as number;
}

export function annullaSigaretta(id: number): Promise<void> {
  return db.smokes.delete(id);
}

export function sigaretteOrdinate(): Promise<Sigaretta[]> {
  return db.smokes.orderBy('timestamp').toArray();
}

export async function registraAcquisto(a: Omit<Acquisto, 'id'>): Promise<number> {
  return (await db.purchases.add(a)) as number;
}

/** Sigarette rimaste in casa. Mai negativa: fumare a scorta zero si registra comunque. */
export async function scortaCorrente(): Promise<number> {
  const [acquisti, fumate] = await Promise.all([db.purchases.toArray(), db.smokes.count()]);
  const comprate = acquisti.reduce((n, a) => n + a.numeroPacchetti * SIGARETTE_PER_PACCHETTO, 0);
  return Math.max(0, comprate - fumate);
}

export async function creaMulta(m: Omit<Multa, 'id' | 'stato'>): Promise<number> {
  return (await db.penalties.add({ ...m, stato: 'da_versare' })) as number;
}

export function multeDaVersare(): Promise<Multa[]> {
  return db.penalties.where('stato').equals('da_versare').toArray();
}

/** L'utente conferma "Ho versato": tutte le multe pendenti passano a versata. */
export async function segnaMulteVersate(dataVersamento: number): Promise<number> {
  return db.penalties
    .where('stato')
    .equals('da_versare')
    .modify({ stato: 'versata', dataVersamento });
}
