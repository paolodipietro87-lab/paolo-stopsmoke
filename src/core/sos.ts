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
