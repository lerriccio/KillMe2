# Stato del lavoro — 26 ottobre 2026

## Implementato e verificato in locale

- Addestramento giocabile in cinque passi, bersaglio di movimento visibile e ambiente senza orde. Non assegna XP e conserva l’eventuale partita sospesa.
- Autosalvataggio, ripresa in pausa dopo riapertura, conservazione di poteri e scelte pendenti, riferimenti fra proiettili e nemici e stato casuale della sfida giornaliera.
- Esportazione JSON e importazione con conferma; rifiuto di file malformati o partite corrotte. L’importazione termina la vecchia partita per evitare che sovrascriva quella importata.
- Timer delle carte facoltativo, disattivato inizialmente, e pausa del combattimento facoltativa durante la scelta. Le carte si possono scorrere con il dito senza scelte accidentali.
- Joystick fisso/mobile, sinistra/destra, dimensione 85–125% e altezza regolabile. Supporto a movimento e abilità con più dita.
- Traiettorie di avviso dei tre boss e direzione di mira fissata prima dell’attacco; suggerimento relativo all’ultimo danno nel riepilogo.
- Campagna di dieci missioni: cinque nuove missioni nel Bosco, scorta del drone, spore con avvertimento, Mycelia e conclusione testuale del secondo capitolo. Migrazione dei progressi del primo capitolo.
- Maestrie per eroe, aspetti sbloccabili e varianti delle armi con compromessi fra danni e cadenza.
- Sfida del giorno con data UTC, seme iniziale ripetibile e record locali; ripresa con seme conservato. Effetti e audio non consumano la casualità di gioco.
- Lingue italiano/inglese per menu, combattimento, carte, storia e principali etichette di accessibilità.
- Testi IT/EN dello store, icona, due feature graphic, sei immagini reali di gameplay e video WebM senza audio, in `store/assets/`. Catture da browser desktop: non sono prove di esecuzione su Android.
- Progetto Android offline API 36 con asset selezionati, origine HTTPS locale, nessun permesso Internet, tasto Indietro, interruzioni e selettore documenti. APK debug e bundle release compilati; restano le prove su dispositivo.

## Verifiche

- 7 suite di simulazione superate.
- 18 suite browser superate, comprese le verifiche aggiuntive di salvataggi, import/export e controlli touch alle dimensioni massime su 320px verticale e 667px orizzontale.
- Compilazione Android debug/release e Android Lint superati; firma dell’APK debug verificata. Il percorso Indietro usa il callback nativo da API 33 e il metodo precedente solo da API 26 a 32.
- Verifica visiva di gameplay, icona e layout touch compatto.
- Pacchetto di 26 asset offline, circa 31,2 MiB, riproducibile con `node tools/package-android.cjs`.

Comandi: `node tools/verify.cjs` e `node tools/verify.cjs --browser`. Il runtime Playwright usato dai test è quello locale già disponibile sul PC. Il confronto di prestazioni è sintetico in Edge, non certifica FPS, consumi o temperatura su Android.

## Build Android

Java 17, Gradle 8.13 e gli strumenti Android sono disponibili in `.tools/`, senza installazioni globali. Il titolare ha autorizzato esplicitamente l’accettazione della licenza SDK il 26 ottobre 2026. Installati Android SDK Platform 36 e Build-Tools 35, compilati APK debug e bundle release. La firma dell’APK debug è stata verificata; il bundle release è senza firma di upload.

Copie locali in `release-build/KillMe2-debug.apk` e `release-build/KillMe2-release-unsigned.aab`, escluse da Git insieme agli strumenti e alle cache. Riproduzione della build: `tools/bootstrap-android.ps1 -Build`. La firma di upload di proprietà del titolare rimane necessaria per la distribuzione su Google Play.

## Ancora necessari per Google Play

Conferma dell’identità dell’account e del contatto definitivo; verifica della privacy policy e collegamento del suo URL in Play Console; chiave di upload e Play App Signing; questionario IARC e pubblico; test reali Android, pre-launch report e test chiuso se previsto per l’account. Il contatto temporaneo autorizzato è `leoriccio@gmail.com`. Non sono stati creati account o pubblicate app su Google Play.

Le modifiche locali già presenti prima di questo lavoro sono state conservate e incluse nella consegna tramite commit e push richiesti su `origin/main`. La versione browser su GitHub è distinta dalla distribuzione Android su Google Play. Come richiesto, **il computer resta acceso**.
