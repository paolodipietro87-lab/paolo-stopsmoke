# CLAUDE.md — Smoke Timer

App per smettere di fumare tramite riduzione graduale. PWA installabile, target smartphone Android. Lingua UI: **italiano**. Utente singolo, nessun account (eccetto login Google per il backup).

## Concept

L'utente registra ogni sigaretta fumata. Un timer stabilisce quando può fumare la successiva. L'intervallo tra sigarette cresce ogni giorno di un valore fisso configurato, fino ad arrivare a zero sigarette. L'app premia il rispetto dei tempi e punisce gli sgarri con tono diretto e severo. Traccia anche spese e scorta di sigarette.

## Stack tecnico

- **PWA** single-page: Vite + React (o Preact) + TypeScript.
- **vite-plugin-pwa** (Workbox) per service worker, manifest, installabilità su Android.
- **IndexedDB** via Dexie.js come storage primario. Nessun backend.
- **Backup Google Drive**: Google Identity Services (OAuth implicit/token flow) + Drive API, scope `drive.appdata`, salvataggio di un unico file JSON in `appDataFolder`. Backup manuale + automatico (es. 1 volta/giorno all'apertura). Ripristino da onboarding.
- **Chart.js** per i grafici.
- Notifiche: **best effort** — Notification API dal service worker quando l'app è aperta o in background recente. NON implementare push server (FCM). Accettato che a app chiusa la notifica possa non arrivare: il timer si ricalcola sempre dai timestamp, mai da contatori in memoria.

## Modello dati (IndexedDB)

- `profile`: nome, dataInizio, sigaretteAlGiornoIniziali, prezzoPacchetto (20 sigarette), incrementoGiornalieroMin, marca (opz.), impostazioni (moltiplicatorePenalità, multaPerSgarro).
- `smokes`: { id, timestamp, inRitardo: boolean, minutiAnticipo: number (0 se regolare) }.
- `purchases`: { id, timestamp, numeroPacchetti, prezzoTotale }.
- `penalties`: { id, timestamp, importo, motivo, stato: 'da_versare' | 'versata', dataVersamento? }.
- `days` (materializzata o calcolata): { data, intervalloTargetMin, sigaretteFumate, sgarri, progressioneCongelata: boolean }.
- `pauses`: { id, dataInizio, dataFine (max inizio+7gg) }.
- Il credito sigarette (max 2) si deriva deterministicamente dai timestamp applicando le regole del credito (maturazione per intervalli interi, esclusione finestra notturna, taglio a 1 a mezzanotte) — non serve persisterlo, ma va implementato in una funzione pura `creditAt(timestamp)` ben testata.
- Scorta corrente = (pacchetti acquistati × 20) − sigarette fumate dall'inizio del tracking scorta (mai negativa; se l'utente fuma a scorta zero, segnalare ma registrare comunque).

## Algoritmo del timer

- Timer **continuo 24h** (nessuna finestra notturna).
- Intervallo base giorno 0: `1440 / sigaretteAlGiornoIniziali` minuti (arrotondato).
- Ogni giorno (a mezzanotte locale): `intervallo(g) = intervallo(g−1) + incrementoGiornalieroMin`, **salvo congelamento** (vedi penalità).
- In onboarding l'app calcola e mostra l'intervallo di partenza e propone incrementi +5 / +10 / +15 min/giorno con proiezione della data di arrivo a zero ("con +10 min/giorno smetterai intorno al 12/10"). Valore modificabile in seguito nelle impostazioni; la modifica vale dal giorno successivo.
- Prossima sigaretta consentita = timestamp ultima sigaretta + intervallo corrente (+ eventuale maggiorazione da sgarro).
- **Credito limitato**: ogni intervallo completo trascorso senza fumare matura 1 sigaretta fumabile subito, con un massimo di **2 sigarette in credito**. Il credito si consuma fumando (una sigaretta col credito attivo non fa ripartire il timer da zero: scala il credito). Mostrare il credito disponibile in dashboard. Due regole anti-scorpacciata mattutina:
  - **finestra notturna senza maturazione**: dalle 00:00 alle 07:00 (orari configurabili in impostazioni) il tempo NON matura crediti; il conteggio riprende alle 07:00 dal punto in cui era rimasto;
  - **taglio di mezzanotte**: alle 00:00 il credito residuo viene ridotto a max 1. Risultato: al risveglio al massimo 1 sigaretta subito disponibile, la successiva dopo l'intervallo pieno.
- **Pausa volontaria**: l'utente può congelare la progressione (intervallo fermo al valore corrente) per **max 7 giorni consecutivi**; attivazione accompagnata da un rimprovero severo e da un contatore visibile "piano in pausa da N giorni". Il tracking di sigarette, sgarri, spese e multe continua normalmente. Al massimo 1 pausa attiva alla volta; allo scadere dei 7 giorni la progressione riparte da sola. Registrare le pause nello storico.
- Il piano termina quando l'intervallo supera 1440 min (meno di 1 sigaretta/giorno) e l'utente registra il primo giorno intero senza fumare → proporre passaggio a modalità mantenimento.

## Sgarri e penalità (tutte e tre, cumulative)

Uno "sgarro" è una sigaretta registrata prima della scadenza del timer.

1. **Timer successivo maggiorato**: il prossimo intervallo = intervallo corrente + i minuti di anticipo rubati (recupero del debito).
2. **Progressione congelata**: se oggi c'è ≥1 sgarro, domani l'intervallo NON aumenta.
3. **Multa economica — salvadanaio reale assistito**: ogni sgarro aggiunge al salvadanaio delle multe un importo pari al costo di 2 sigarette (prezzoPacchetto/20 × 2, configurabile). L'app NON muove denaro reale (niente integrazione bancaria/PSD2), ma guida l'utente a versarlo davvero:
   - ogni multa ha stato `da_versare` / `versata`;
   - la dashboard mostra il totale da versare in evidenza;
   - pulsante "Versa ora": copia automaticamente l'importo negli appunti (Clipboard API), lo mostra a schermo e apre l'app bancaria dell'utente tramite link/deep link configurato in impostazioni. Nessuna integrazione diretta col conto: il versamento lo autorizza sempre l'utente nella propria app bancaria. Caso d'uso primario (utente reale): Salvadanaio digitale di Poste Italiane con Postepay Evolution + Libretto Smart, obiettivo dedicato "Multe sigarette". Dal 9/10/2025 esiste un'unica app "Poste Italiane" (le vecchie app BancoPosta e Postepay sono dismesse): tutte le operazioni sul Salvadanaio avvengono lì. Su Android da PWA usare un intent URL Chrome per aprirla (verificare il package name reale dell'app Poste Italiane in fase di sviluppo dal Play Store), con fallback al Play Store se non installata. Il deep link deve restare configurabile per altre banche (Revolut, Hype, ecc.);
   - al ritorno l'utente conferma "Ho versato" → multe marcate `versata` con data;
   - vincoli del Salvadanaio Poste da rispettare nel design: il recupero fondi chiude l'obiettivo PER INTERO (nessun prelievo parziale) → l'app non deve mai proporre prelievi parziali dal salvadanaio; prevedere versamento cumulativo settimanale nel caso esista un importo minimo per versamento; il servizio Poste non è disponibile H24 → un versamento fallito resta semplicemente `da_versare`;
   - promemoria severo settimanale (e a ogni apertura oltre soglia, es. >10 €) se ci sono multe non versate;
   - storico versamenti visibile: quei soldi sono un fondo reale per necessità future, e le statistiche mostrano il totale accantonato.

## Tono e messaggi

Diretto e severo, mai volgare. Complimenti asciutti quando l'utente rispetta i tempi ("Timer rispettato. 6 di fila oggi."), rimproveri espliciti con dati crudi quando sgarra ("Hai fumato 22 minuti in anticipo. Multa: 1,10 €. Domani non migliori."). Scrivere un set di ~15 messaggi per categoria (rispetto timer, sgarro lieve, sgarro pesante, fine giornata pulita, giornata rovinata, milestone) con rotazione casuale, in italiano.

## Schermata principale (dashboard completa)

Tutto visibile a colpo d'occhio, senza scroll su un telefono medio:

- Saluto personalizzato in testa ("Ciao Paolo." + sintesi secca della giornata, coerente col tono severo).
- Countdown alla prossima sigaretta consentita (elemento più grande; verde se scaduto → "Puoi fumare").
- Pulsante grande "HO FUMATO" (registra timestamp corrente; conferma con undo di 10 secondi).
- Oggi: sigarette fumate / target del giorno, sgarri.
- Streak giorni senza sgarri + record.
- Soldi risparmiati (vs consumo iniziale) e salvadanaio multe.
- Scorta: sigarette rimaste + previsione "a questo ritmo finisci il pacchetto giovedì".
- Accesso a: Statistiche, Acquisti, Traguardi, Salute, Impostazioni.

## Sezioni secondarie

- **Acquisti**: form rapido (n. pacchetti, prezzo totale, data precompilata oggi), storico, spesa mensile.
- **Statistiche**: grafico sigarette/giorno vs target, sgarri per giorno, andamento intervallo, e un **report economico** con tre voci sempre distinte: (1) spesa totale acquisto sigarette (da `purchases`, per mese e cumulata), (2) multe: totale versato al salvadanaio + totale ancora da versare (da `penalties`), (3) risparmio rispetto al consumo iniziale. Esportabile/visualizzabile per periodo (mese, anno, dall'inizio).
- **Traguardi (badge)**: prima giornata senza sgarri, −25/−50/−75% rispetto al consumo iniziale, 1 settimana di streak, 50/100/500 € risparmiati, primo giorno a zero sigarette, 1 mese smoke-free, ecc.
- **Salute**: timeline benefici basata su dati OMS/fonti mediche pubbliche (20 min: pressione; 24h: CO normalizzato; 2 settimane: circolazione; 1 mese: polmoni; 1 anno: rischio cardiaco dimezzato...), sbloccati progressivamente in mantenimento.
- **Risparmio proiettato**: proiezione a 1/6/12 mesi al ritmo attuale, con equivalenze concrete ("= un weekend fuori").

## Primo avvio e onboarding

Al primo avvio: schermata di benvenuto con due percorsi — "Inizia" o "Ripristina da backup" (login Google → ripristino del JSON da Drive, si salta l'onboarding). Percorso nuovo utente:

1. Come ti chiami (per il saluto personalizzato).
2. Cosa fumi (solo sigarette confezionate in v1; marca opzionale).
3. Quante sigarette al giorno.
4. Prezzo del pacchetto.
5. Scelta incremento giornaliero con proiezioni.
6. Riepilogo piano severo e chiaro ("Oggi: 1 sigaretta ogni 72 minuti. Ogni giorno +10. Zero sigarette il 12/10. Si comincia.").
7. Offerta collegamento Google Drive per backup (rimandabile) e configurazione link app bancaria per il salvadanaio (rimandabile).
8. "Quando hai fumato l'ultima sigaretta?" (default: adesso) → il primo timer parte da questo timestamp reale.

## Modalità mantenimento (dopo lo zero)

- Contatore giorni/ore smoke-free in evidenza.
- Risparmio cumulato che continua a crescere.
- Timeline salute che si sblocca nel tempo.
- Pulsante SOS craving: mostra un messaggio duro + i numeri (giorni puliti, soldi risparmiati, cosa perderebbe).
- Se l'utente registra una sigaretta in mantenimento: non azzerare tutto, registrare la ricaduta, tono severo, contatore riparte ma storico e risparmi restano visibili.

## Vincoli e note implementative

- Tutti i calcoli del timer derivano dai **timestamp persistiti**, mai da setInterval in memoria: l'app deve mostrare lo stato corretto a ogni riapertura.
- Gestire il cambio giorno con timezone locale del dispositivo.
- Undo (10 s) sulla registrazione sigaretta; correzione/cancellazione voci da storico.
- **Registrazione retroattiva**: dallo storico si può aggiungere una sigaretta con data/ora passata ("me la sono dimenticata"); il sistema ricalcola timer, sgarri, multe e statistiche del periodo interessato.
- **Deploy**: GitHub Pages. Repository GitHub con GitHub Actions per build Vite e pubblicazione automatica su push a `main`. Configurare `base` in vite.config per il path del repo; il service worker e il manifest devono funzionare sotto sottopath (es. `/smoke-timer/`).
- Export/import manuale JSON oltre al backup Drive.
- Dark mode di default (app usata spesso di sera/notte).
- Niente analytics, niente tracciamento terze parti.
- Testare: sgarro multiplo nello stesso giorno, giorno senza alcuna sigaretta a metà piano, cambio incremento a piano in corso, riapertura app dopo giorni di inutilizzo (ricostruire i giorni mancanti), scorta a zero.

## Fuori scope v1

Tabacco rollato, sigarette elettroniche, multi-utente, notifiche push server (FCM), versione iOS dedicata, pubblicazione su Play Store (valutare TWA in v2 se le notifiche best-effort si rivelano insufficienti).

## Decisioni chiarite (sessione 2026-07-09)

- **Credito vs sgarro**: se il credito è ≥1, fumare non è sgarro — consuma 1 credito, nessuna multa. Il countdown mostra "Puoi fumare" quando credito ≥1.
- **Maturazione credito**: il primo intervallo dopo una sigaretta è il countdown normale; il credito matura solo dagli intervalli pieni successivi (2 intervalli senza fumare = 1 credito), escludendo la finestra notturna.
- **Sgarri multipli**: debito cumulativo. Ogni sgarro somma i minuti rubati a un debito; il prossimo intervallo = intervallo + debito totale residuo, azzerato solo quando l'utente rispetta il timer maggiorato.
- **Congelamento**: 1 giorno di congelamento per ogni giorno con ≥1 sgarro (nessun accumulo oltre il giorno successivo).
