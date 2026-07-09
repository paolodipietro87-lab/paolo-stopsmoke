export type CategoriaMessaggio =
  | 'timerRispettato'
  | 'sgarroLieve'
  | 'sgarroPesante'
  | 'giornataPulita'
  | 'giornataRovinata'
  | 'milestone';

/** Soglia in minuti oltre la quale uno sgarro e considerato pesante. */
export const SOGLIA_SGARRO_PESANTE_MIN = 20;

export const MESSAGGI: Record<CategoriaMessaggio, readonly string[]> = {
  timerRispettato: [
    'Timer rispettato. Continua cosi.',
    'Hai aspettato. Era il minimo.',
    'Puntuale. Non e un favore che mi fai.',
    'Rispettato. Il prossimo sara piu lungo.',
    'Bene. Nessuna multa oggi da questa.',
    'Hai retto. Ricordatelo stasera.',
    'Tempo pieno. Come deve essere.',
    'Nessuno sconto preso. Bravo.',
    'Regolare. Avanti.',
    'Hai vinto contro te stesso. Per ora.',
    'Zero minuti rubati. Zero euro persi.',
    'Disciplina. Non fortuna.',
    'Rispettato. Domani sara piu dura.',
    'Un altro intervallo intero. Accumula.',
    'Fatto. Senza sconti.',
  ],
  sgarroLieve: [
    'In anticipo. Poco, ma in anticipo.',
    'Non ce l hai fatta ad aspettare. Multa.',
    'Minuti rubati. Te li riprendo dal prossimo timer.',
    'Piccolo cedimento. Costa comunque.',
    'Hai barato di poco. Hai barato.',
    'Il timer non era finito. Lo sapevi.',
    'Anticipo pagato in euro. Versali.',
    'Domani la progressione non cresce. Colpa tua.',
    'Bastava aspettare ancora un po.',
    'Sgarro registrato. Nessuna scusa accettata.',
    'Poco anticipo, stesso prezzo.',
    'Hai ceduto. Riparti.',
    'Il debito lo paghi al prossimo giro.',
    'Non era craving. Era abitudine.',
    'Sgarro. Punto.',
  ],
  sgarroPesante: [
    'Hai fumato molto prima. Questo e un fallimento.',
    'Anticipo grave. Il piano si ferma domani.',
    'Non stai nemmeno provando.',
    'Multa pesante. Guardala nel salvadanaio.',
    'Hai buttato via la giornata.',
    'Questo non e uno scivolone. E una resa.',
    'Il timer esisteva. Tu no.',
    'Ogni minuto rubato te lo riprendo.',
    'Grave. Domani niente progressione.',
    'Hai deciso di perdere. Registrato.',
    'Nessuna scusa regge questo anticipo.',
    'Il debito ora e alto. Ripagalo.',
    'Rileggiti i soldi risparmiati. Poi ripensaci.',
    'Sgarro pesante. La streak e finita.',
    'Questa te la ricorderai.',
  ],
  giornataPulita: [
    'Giornata chiusa senza sgarri. Uno di seguito.',
    'Nessun minuto rubato oggi.',
    'Zero multe. Zero scuse necessarie.',
    'Giornata pulita. Domani si alza l asticella.',
    'Hai retto tutto il giorno. Ripetilo.',
    'Chiusa bene. Il piano avanza.',
    'Nessun cedimento. Registrato.',
    'Oggi hai vinto. Domani si ricomincia.',
    'Pulita. Continua a contare.',
    'Nessuna multa da versare stasera.',
    'Giornata intera rispettata.',
    'Sei piu vicino allo zero.',
    'Un giorno in meno da fumatore.',
    'Nessun debito accumulato.',
    'Giornata senza sconti. Bene.',
  ],
  giornataRovinata: [
    'Giornata rovinata. Domani il piano non cresce.',
    'Hai sgarrato. La progressione si ferma.',
    'Chiusa male. I numeri restano.',
    'Oggi hai perso. Guarda le multe.',
    'Giornata sprecata. Non riprovarci domani.',
    'Il salvadanaio si e riempito per colpa tua.',
    'Streak azzerata. Ricomincia da zero.',
    'Nessun progresso oggi. Solo debito.',
    'Hai fumato prima. Piu volte.',
    'Giornata da dimenticare. I dati no.',
    'Domani stesso intervallo. Punizione.',
    'Non e andata. Ammettilo.',
    'Multe da versare. Fallo adesso.',
    'Hai rubato tempo a te stesso.',
    'Chiusa in rosso.',
  ],
  milestone: [
    'Traguardo raggiunto. Non fermarti.',
    'Ce l hai fatta. Ora la parte difficile.',
    'Numeri alla mano: stai smettendo.',
    'Milestone sbloccata. Merito tuo.',
    'Il corpo se ne sta accorgendo.',
    'Risparmio reale. Guarda le cifre.',
    'Un passo grosso. Il prossimo e piu grosso.',
    'Traguardo. Nessuna celebrazione lunga.',
    'Hai dimostrato che si puo.',
    'Continua. Lo zero e vicino.',
    'Questo lo hai guadagnato.',
    'Progresso concreto, non sensazioni.',
    'Nuovo record. Superalo.',
    'La salute torna indietro. Lentamente.',
    'Traguardo registrato. Avanti.',
  ],
};

/**
 * Messaggio della categoria, scelto con rotazione deterministica su `seed`
 * (di solito il timestamp): stesso evento, stesso messaggio.
 */
export function messaggio(categoria: CategoriaMessaggio, seed: number): string {
  const lista = MESSAGGI[categoria];
  const i = Math.abs(Math.trunc(seed)) % lista.length;
  return lista[i];
}

export function categoriaSgarro(minutiAnticipo: number): CategoriaMessaggio {
  return minutiAnticipo >= SOGLIA_SGARRO_PESANTE_MIN ? 'sgarroPesante' : 'sgarroLieve';
}
