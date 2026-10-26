# KillMe2 — preparazione Google Play

Stato: versione browser e sorgenti destinati a GitHub; app non pubblicata su Google Play. Nessuna garanzia di approvazione, valutazioni o download. Requisiti verificati il 26 ottobre 2026.

## Già preparato

- Progetto Android offline con compile/target SDK 36 e minSdk 26.
- Asset del gioco selezionati con allowlist; esclusi brani di anteprima non utilizzati, test e file di sviluppo.
- Nessun account, SDK pubblicitario, analisi di utilizzo o acquisto nell’app.
- Tutorial, ripresa della partita, esportazione/importazione, dieci missioni, maestrie, aspetti, varianti delle armi, sfida giornaliera locale, impostazioni touch e lingua inglese.
- Riconoscimenti accessibili e riferimenti alle licenze dei quattro brani effettivamente inclusi.
- Test automatici di simulazione e browser; non equivalgono a prove sul telefono.
- Testi IT/EN della scheda e generatori di icona, feature graphic, schermate reali e video WebM di gameplay. Il video è senza audio; prima dell’uso controllarne ritmo e contenuto e convertirlo nel formato richiesto dal servizio video scelto.

## Dati e attività del titolare ancora necessari

1. Confermare nome pubblico e identità dell’account sviluppatore, email definitiva di assistenza/privacy e application ID prima del primo caricamento. Il contatto temporaneo autorizzato è leoriccio@gmail.com. Il nome pacchetto diventa parte dell’identità permanente dell’app pubblicata.
2. Verificare i dati definitivi in `privacy.html` e collegarne l’URL HTTPS pubblico in Play Console. La pagina contiene il contatto temporaneo e va ricontrollata prima della pubblicazione su Google Play.
3. Creare o scegliere una chiave di upload di proprietà del titolare, conservarla con backup e configurare Play App Signing. Non pubblicare un APK debug e non perdere le credenziali.
4. Compilare Sicurezza dei dati in base alla build reale. Per questa versione offline la base proposta è nessuna raccolta e nessuna condivisione da parte del gioco; verificare nuovamente se si aggiungono SDK, pubblicità, account o servizi.
5. Dichiarare assenza di pubblicità, accesso libero senza credenziali, pubblico effettivo e classificazione IARC. Non scegliere un rating arbitrario e non dichiarare un pubblico bambini senza verificare tutti i relativi requisiti.
6. Provare la build Android su almeno un telefono economico, uno intermedio e uno recente: 15–20 minuti di orde e boss, temperatura, batteria, audio, rotazione, notch, navigazione gestuale, interruzioni, chiusura del processo, ripresa e import/export.
7. Eseguire il pre-launch report della Play Console e correggere crash, ANR e problemi di accessibilità. Verificare le condizioni di licenza e la provenienza di tutti gli asset della build finale.
8. Se richiesto per il proprio account personale: almeno 12 tester iscritti continuativamente per 14 giorni nel test chiuso, quindi richiesta di accesso alla produzione. La sola iscrizione senza uso significativo non dimostra un test utile.
9. Caricare la scheda IT/EN, icona 512×512, feature graphic 1024×500 e almeno tre schermate di gameplay 1920×1080; controllare le anteprime. Il filmato richiede un caricamento su un servizio supportato, non viene pubblicato da questo progetto.

## Piano di test con persone

Invitare giocatori che non conoscono il progetto, senza spiegare i comandi prima del tutorial. Annotare per ciascuno dispositivo/versione, comprensione del primo minuto, missione raggiunta, causa delle sconfitte, fastidi ai comandi, interesse a rigiocare e problemi di salvataggio. Nessuna richiesta di recensioni positive, premi per valutazioni o acquisto di recensioni.

Prima del lancio esteso, usare un gruppo ristretto e misurare quanto segue tramite riscontri volontari dei tester e dati disponibili nella Play Console: completamento del tutorial, abbandono della prima missione, giocatori che ritornano il giorno dopo, crash e blocchi per dispositivo. Il gioco non include telemetria: questi indicatori non sono misurati automaticamente dal codice attuale.

Una volta pubblicato, rispondere ai problemi riportati nelle recensioni, raggruppare quelli ricorrenti e dare priorità a controlli, salvataggi e stabilità. Investire in campagne di acquisizione dopo aver dimostrato che le persone tornano a giocare. Classifiche online e multiplayer sono possibili progetti futuri, non requisiti di questa versione.

## Fonti ufficiali

- [Target API Google Play](https://support.google.com/googleplay/android-developer/answer/11926878)
- [Test per nuovi account personali](https://support.google.com/googleplay/android-developer/answer/14151465)
- [Preparazione alla revisione](https://support.google.com/googleplay/android-developer/answer/9859455)
- [Dimensioni degli asset dello store](https://support.google.com/googleplay/android-developer/answer/9866151)
- [Android vitals](https://developer.android.com/google/play/vitals)
