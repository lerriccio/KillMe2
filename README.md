# KillMe2

## Preparazione Android e miglioramenti del 26 ottobre 2026

Il sottotitolo dello store è **Forge Survivors**; il gioco conserva il nome KillMe2. La campagna ora comprende **dieci missioni in due capitoli**, Canyon e Bosco dei Funghi. Il secondo introduce spore con avviso prima del danno, la scorta di un drone che aspetta quando sei lontano o ci sono predoni, e lo scontro con Mycelia. Dopo il primo finale si sblocca la missione 6; dopo la missione 10 una conclusione testuale chiude l’arco dei quattro nuclei. Le illustrazioni del primo capitolo restano quelle originali.

Il menu propone un addestramento giocabile di cinque passi, la ripresa della partita e le maestrie degli eroi. L’addestramento avviene senza orde e non assegna ricompense né sovrascrive la partita sospesa. Le partite si salvano ogni cinque secondi di gioco, in pausa, tornando al menu e quando la pagina viene nascosta. Il ripristino conserva nemici, proiettili e relativi bersagli già colpiti, obiettivi, gradi, carte da scegliere e sequenza casuale; riprende in pausa. In caso di terminazione improvvisa possono andare persi gli ultimi cinque secondi. I salvataggi sono locali, senza sincronizzazione automatica fra dispositivi. Esporta/importa un JSON dalle impostazioni per creare un backup o trasferirli.

La scelta dei poteri mantiene il combattimento attivo e il supporto multitouch. Il timer automatico è **disattivato per impostazione predefinita**; nelle impostazioni puoi attivarlo oppure fermare il combattimento durante la lettura delle carte. Sono regolabili lato, dimensione e altezza dei comandi, con joystick fisso o mobile. I boss mostrano traiettorie anticipate coerenti con la prossima raffica e fissano la direzione di mira prima del colpo. Il riepilogo spiega la causa dell’ultimo danno.

Ogni eroe ha maestria da 1 a 20, XP da tempo giocato, eliminazioni, boss e vittorie. Aspetti: Cobalto al grado 3, Brace dopo 5 boss, Prisma con combo 50. Le varianti dell’arma si sbloccano ai gradi 2 e 4: Pesante (+25% danni e intervallo fra attacchi), Rapida (−20% danni e intervallo). Hanno compromessi, senza acquisti o incrementi permanenti obbligatori delle statistiche. La sfida del giorno usa data UTC, eroe/arena e seme iniziale condivisi; riprovarla riparte dallo stesso seme. I risultati sono solo locali e le varianti dell’arma sono disattivate nella sfida. Il seme di gioco è distinto dalla casualità di effetti e audio.

Italiano e inglese si selezionano nelle impostazioni, includendo interfaccia, carte, storia, testi su canvas e principali etichette di accessibilità. `release.js` gestisce profilo e salvataggi; `i18n.js` gestisce le traduzioni senza servizi esterni. La versione non contiene pubblicità, acquisti, account o telemetria.

Il progetto Android in `android/` usa API 36, minimo Android 8, una WebView con origine HTTPS locale e soli asset inclusi; non richiede permessi Internet o accesso generale ai file. Include tasto Indietro, gestione delle interruzioni e selettore documenti per i backup. La licenza SDK è stata accettata su autorizzazione del titolare e sono stati compilati APK debug e bundle release; il bundle richiede ancora la firma di upload. Restano necessarie le prove su telefoni reali. Vedi `android/README.md`.

Materiali dello store in `store/`: descrizioni IT/EN, icona, feature graphic, sei schermate reali di gameplay e un video WebM senza audio. `privacy.html` contiene il contatto temporaneo autorizzato `leoriccio@gmail.com`, da verificare e sostituire prima della pubblicazione su Google Play. `store/RELEASE-CHECKLIST.md` distingue i preparativi da firma, account, classificazione, test chiuso e pubblicazione da completare in Play Console. Il push su GitHub aggiorna la versione browser e i sorgenti; non carica l’app su Google Play.

Verifiche: `node tools/verify.cjs` (simulazioni), `node tools/verify.cjs --browser` (Edge/Playwright). I nuovi test coprono anche secondo capitolo, tutorial completo, ripresa, ricompense senza duplicazione, traduzioni, timer facoltativo e import/export con rifiuto dei file corrotti. Le misure di prestazioni in browser emulato non garantiscono FPS, consumi o stabilità su un telefono Android.

Le sezioni successive descrivono anche versioni precedenti: in caso di differenze valgono le impostazioni e i contenuti riepilogati qui.

### Animazioni dei personaggi

Tutti e quattro gli eroi hanno 10 sequenze di sprite pixel art: attesa (6 fotogrammi), movimento (8), attacco (6), scatto (6), super (10), danno (4), comparsa e rinascita (8), cura (6), potenziamento (8) e Furia (8). Sono 70 fotogrammi per eroe, 280 complessivi, costruiti dai disegni originali e memorizzati nella cache come immagini senza interpolazione. Gambe alternate, cingoli di Bastion e mantello di Nyx hanno movimenti dedicati; rinculo, ascia e chakram seguono i fotogrammi dell’attacco e mantengono la mira automatica. Anche il personaggio grande nel menu respira e batte le palpebre.

Le animazioni si fermano in pausa e durante la scelta dei potenziamenti. Scatto e super hanno precedenza sugli attacchi automatici; le sequenze tornano al movimento o all’attesa al termine. `node tests/animations.cjs` verifica fotogrammi e transizioni per tutti gli eroi e salva un’anteprima in `tests/animation-sequences.png`.

### Fluidità su mobile

Gli sprite vengono rasterizzati una volta e riutilizzati, mantenendo la pixel art originale. L’HUD si aggiorna ogni 100 ms; movimento e combattimento continuano a ogni fotogramma. Sui dispositivi touch il canvas dei testi usa la risoluzione CSS, gli effetti sono limitati a 240 particelle, 32 anelli e 32 numeri di danno simultanei, e le finestre evitano la sfocatura dello sfondo. Nemici, proiettili, danni e ricompense restano invariati.

`node tests/mobile-performance.cjs` verifica gli sprite pixel per pixel (anche specchiati), i limiti degli effetti e una scena con 260 nemici, 350 cristalli e 64 proiettili in Edge mobile emulato con CPU rallentata 4×. Un percorso sorgente opzionale permette un confronto con una versione precedente. I tempi sono misure sintetiche di aggiornamento/disegno, non FPS garantiti su un telefono reale.

Arena roguelite con grafica arcade 8 bit: quattro eroi e nemici disegnati con sprite originali a pixel, tre arene a tessere (canyon, bosco dei funghi e forgia), proiettili e super colpi pixellati. Il Canvas lavora a un terzo della risoluzione e viene ingrandito senza interpolazione. Menu, HUD, selezione eroi e finestre usano bordi squadrati, colori netti e un carattere bitmap originale salvato localmente. Una leggera trama a righe richiama lo schermo del cabinato.

Tre boss giganti alle ondate 4, 8 e 12: Gorath, Mycelia e Omega, con sprite distinti, barra della vita e attacchi più intensi sotto il 50% della vita. Le decorazioni delle arene non bloccano il movimento.

## Campagna: Il cuore della Forgia

Dal menu scegli **CAMPAGNA**: il primo capitolo, **Il segnale nella polvere**, contiene cinque missioni nel Canyon. Scegli liberamente Axiom, Vulkor, Bastion o Nyx sulla mappa. Ogni missione dura due ondate e riparte con vita e potenziamenti iniziali; completarla sblocca la successiva. Puoi rigiocare le missioni già superate. Sblocchi e prologo visto sono salvati localmente nel browser con la chiave `killme2-campaign-v1`.

1. Imboscata nella polvere: sopravvivi e libera il passo.
2. Le torri del silenzio: distruggi i tre ripetitori, bersagli fissi con segnale rosa.
3. L’ultima scintilla: proteggi il generatore azzurro al centro dai predoni; se arriva a zero la missione fallisce.
4. Memorie del convoglio: attraversa le tre memorie verdi per raccoglierle, poi libera la zona.
5. Il re dei predoni: affronta Gorath nell’ultima ondata.

Prologo e finale hanno quattro vignette illustrate originali in pixel art 8 bit, con palette desaturata e balloon leggibili, navigabili, saltabili e rileggibili dalla mappa. Ogni missione introduce nuovi dialoghi. Il finale prepara il Bosco dei Funghi: i capitoli successivi non sono ancora giocabili. **ARCADE** mantiene la partita originale da dodici ondate e tre boss.

Verifica della campagna: `node tests/campaign.cjs` e `node tests/campaign-browser.cjs`.

## Gioca

Fai doppio clic su **AVVIA KillMe2.cmd** oppure **Play.cmd**. Il vecchio collegamento **AVVIA NEON REQUIEM.cmd** funziona ancora. Ogni apertura carica i file locali aggiornati, evitando la cache. Puoi anche aprire **index.html** in un browser moderno. Non occorre installare dipendenze. Il carattere Arcade Pixel è locale: la grafica non richiede connessione.

Scegli uno dei quattro eroi nel menu. La selezione cambia aspetto, vita, velocità, arma iniziale e super colpo:

| Eroe | Arma | Super colpo |
| --- | --- | --- |
| Axiom, androide da duello | Railgun Gemini: due fucili perforanti | Collasso di plasma: 32 lance potenziate |
| Vulkor, drago corazzato | Ascia Sismica: area di 165 px e respinta | Fractura tectonica: terremoto, danni e forte respinta |
| Bastion, mech cingolato | Obice Apocalisse: razzi con esplosioni di 125 px | Protocollo Apocalisse: esplosione e 12 missili radiali |
| Nyx, spettro del vuoto | Chakram Eclisse: lame rotanti a rimbalzo | Eclisse delle anime: 32 lame potenziate con cinque rimbalzi |

- WASD o frecce: movimento; mira e attacco automatici. Le raffiche mantengono un colpo sulla linea di mira anche con 4 proiettili e usano un cono stretto.
- I nemici arrivano in gruppi da 12 a 28 (da 24 a 36 nelle ondate di assalto), con frequenza crescente e un massimo di 600 presenze ordinarie contemporanee. Boss infiniti arriva a 1000 nemici, con gruppi da 36 a 48.
- Vita iniziale: Axiom 40, Vulkor 70, Bastion 55, Nyx 35. Dopo un colpo la protezione dura 0,45 secondi (0,4 per i proiettili); tra le ondate Arcade recuperi 6 punti vita.
- Spazio: scatto offensivo e breve invulnerabilità, ricarica 2,6 secondi.
- E: super colpo del personaggio, ricarica 12 secondi; elimina anche i proiettili ostili vicini.
- Esc: pausa, attiva anche quando la finestra perde il focus.
- Mobile e tablet: joystick touch a sinistra, Scatto e Super a destra; puoi usare due dita per muoverti e attivare un'abilità insieme. Menu e HUD si adattano al formato verticale e orizzontale, rispettando le aree sicure del display.
- Il pulsante **SCHERMO INTERO**, evidenziato in azzurro in alto a destra, attiva o disattiva lo schermo intero; funziona anche con **F**. Negli altri browser appare un avviso.
- **AUDIO ON/OFF** o **M** attiva e disattiva l’audio. **PAUSA / RIPRENDI** o **Esc** sospende e riprende la partita. La pausa compare durante la partita e si disattiva durante le scelte dei potenziamenti e il riepilogo finale. Il logo WB torna al menu salvando il record.
- Tutti i pulsanti del menu funzionano con Tab e Invio/Spazio; le frecce cambiano la destinazione nel selettore. Durante il combattimento Spazio attiva solo lo scatto, evitando clic accidentali sul pulsante che aveva il focus. I comandi hanno aree cliccabili di almeno 44 px e la barra superiore si dispone su due righe sui telefoni stretti.
- Raccogli le gemme per salire di livello e scegliere potenziamenti cumulativi.
- Dodici ondate, tre boss, tre ambientazioni. Al termine del tempo elimina i superstiti.
- Le eliminazioni consecutive aumentano il moltiplicatore fino a ×5; la combo termina dopo 3,5 secondi senza eliminazioni.

Scegli l’arena dal menu. Club Diver accompagna automaticamente il menu in loop; se il browser blocca l’audio automatico, parte al primo clic o tasto. Iniziando una partita passa alla playlist arcade. Il selettore della musica è stato rimosso. La colonna sonora predefinita riproduce Mega Hyper Ultrastorm → Blown Away → Furious Freak, con 2,5 secondi di silenzio fra i brani, poi riparte dal primo. Il ritorno al menu annulla il prossimo brano della partita e riavvia Club Diver; le nuove partite alternano il brano iniziale (1 → 5 → 10 → 1), ricordando il turno anche dopo una riapertura. Durante la partita la playlist prosegue ciclicamente dal brano iniziale. Musiche di Kevin MacLeod, licenza CC BY 4.0; fonti e crediti in soundtrack-preview-2/CREDITS.md. Club Diver (140 BPM), scelta dalla terza selezione, è la musica automatica del menu; crediti in soundtrack-preview-3/CREDITS.md. Le tre vecchie tracce sintetiche sono state rimosse dal menu; gli effetti principali usano ora le registrazioni locali Kenney. Il record locale è conservato, compreso quello della versione precedente.

## Pubblicazione e licenze musicali

Il promemoria [MUSIC-LICENSE-NOTES.md](MUSIC-LICENSE-NOTES.md) raccoglie le condizioni d'uso commerciale delle soundtrack e i crediti da preparare nell'app prima della pubblicazione sul Play Store.

## File e verifica

`index.html`: interfaccia. `style.css`: stile. `game.js`: combattimento, sprite pixel art, arene a tessere e audio. Nessun framework o build.

Dieci effetti sonori OGG scaricati dal pacchetto **Kenney Sci-fi Sounds**, CC0: spari laser, obice, lame, impatti metallici, scatto, esplosioni, boss, cristalli e potenziamenti. Sono conservati localmente in `assets/audio/kenney/Audio/`, con fonti e licenza in `assets/audio/CREDITS.md`. La riproduzione limita le voci simultanee, varia leggermente l'intonazione, rispetta il pulsante audio e si ferma tornando al menu. Gli effetti Web Audio sono il ripiego in caso di errore di riproduzione.

`node tests/smoke.cjs` verifica i quattro personaggi e la simulazione di gioco, pause, potenziamenti, boss, vittoria e sconfitta. `tests/browser.cjs` verifica selezione e comandi in Edge con Playwright, quando disponibile nel runtime locale. `node tests/arcade.cjs` verifica le tre arene pixel art, i tre attacchi dei boss in furia, la decodifica dei dieci OGG, la riproduzione effettiva, il mute e l'arresto degli effetti al menu; salva un'immagine per arena.

`node tests/controls.cjs` verifica i comandi con la tastiera, il focus, pausa e riprova, audio, schermo intero e pulsanti senza sovrapposizioni in cinque formati da 320 a 1440 px. `node tests/mobile.cjs` verifica joystick, abilità con due dita, annullamento del tocco e schermo intero.

Prototipo giocabile per tastiera desktop; il bilanciamento richiede playtest. I ritratti e i personaggi in arena condividono lo stesso disegno Canvas e non richiedono immagini esterne.

Il font originale `assets/arcade-pixel.ttf` è rigenerabile con `tests/build-pixel-font.py` (solo libreria standard Python); è distribuito in CC0.

## Riconoscimenti

Il pulsante RICONOSCIMENTI nel menu apre i crediti: Lerriccio (ideazione e creazione), Codex (assistenza allo sviluppo), Kevin MacLeod (quattro brani con fonti e CC BY 4.0), Kenney (Sci-fi Sounds, CC0) e il font locale Arcade Pixel (CC0). La finestra si chiude con CHIUDI o Esc; la musica del menu continua.


### Arsenale e gradi dei potenziamenti

A ogni livello vengono proposte 3 carte diverse da un arsenale di 24 abilità. La pesca sceglie prima la rarità: comune 60%, raro 27%, epico 10%, leggendario 3%; poi sceglie un’abilità disponibile di quella rarità. Le offerte precedenti hanno meno peso per variare le combinazioni. Le abilità al limite non vengono riproposte; se una rarità non ha più carte disponibili, le probabilità vengono ridistribuite tra le altre.

La prima scelta sblocca il grado 1. Ritrovare la stessa abilità mostra il grado attuale e quello successivo e aggiunge un solo grado. I gradi e gli effetti valgono per la partita corrente. I poteri includono rigenerazione, corazza, rallentamento, furto vita, fulmini, aura, resurrezione ed esecuzione. Perforazione e multicolpo hanno effetti specifici per l’ascia e l’obice.

Scatto e super si possono attivare anche cliccando i relativi pulsanti in basso; durante la ricarica il pulsante è disabilitato. Carte, selezione eroe e comandi condividono uno stile arcade con stati di selezione, focus e pressione.

Verifiche aggiuntive: `node tests/upgrades.cjs` per probabilità, gradi ed effetti; `node tests/upgrades-browser.cjs` per carte responsive e interazioni in Edge.


### Furia, bottini e ondate speciali

Le eliminazioni caricano la barra Furia (25 nemici ordinari, meno con élite e boss). A barra piena ottieni 7 secondi di cadenza doppia e danni +50%, recuperi lo scatto e riduci di 4 secondi la ricarica della super. La carica decade lentamente quando la combo scade. La barra sotto la combo mostra il tempo rimasto per proseguirla.

Lo scatto cancella i proiettili nemici entro 68 passi: ogni colpo parato dà 2 punti Furia e riduce di 0,2 secondi la ricarica della super. Tra le ondate lo scatto torna pronto, i proiettili ostili spariscono e i cristalli rimasti vengono richiamati verso l’eroe.

Le ondate alternano caccia libera, corsa all’oro (esperienza doppia), sciame (più nemici con il 30% di vita in meno) e alta tensione (nemici +20% velocità, ricarica scatto −35%). Ogni quarta ondata resta dedicata a un boss. Il modificatore e il suo effetto sono visibili nell’HUD.

Nelle ondate ordinarie arrivano élite corazzate, riconoscibili dal cerchio dorato: vita ×2,5, velocità ×1,25 e bottino garantito. Anche i boss e ogni 22ª eliminazione lasciano un oggetto. Raccoglilo entro 14 secondi: **+** ripara il 25% della vita massima, **M** richiama tutti i cristalli, **F** dà 40 punti Furia, ricarica lo scatto e toglie 5 secondi alla super. Le élite e i boss garantiscono una cura quando la vita è sotto il 55%.

Il riepilogo finale include la combo migliore e le Furie attivate. Tutti i nuovi bonus si azzerano a ogni partita e si fermano durante pausa e scelta dei potenziamenti.

Verifiche: `node tests/fun.cjs` copre Furia, parate, bottini, élite, modificatori e reset; `node tests/fun-browser.cjs` verifica HUD, pausa e visualizzazione desktop/mobile in Edge.

Le tavole della campagna sono salvate in `assets/comics/chapter-01-intro-8bit.png` e `assets/comics/chapter-01-ending-8bit.png`: atlanti 2×2, quattro scene ciascuno. Creati con ImageGen; prompt e vincoli cromatici sono in `assets/comics/PROMPTS.md`. Il lettore mostra una scena alla volta con campionamento senza interpolazione; i dialoghi restano testo HTML leggibile anche su mobile.

### Revisione grafica e combattimento (25 ottobre 2026)

Arena e testi ora vengono renderizzati alla risoluzione del display, con DPR massimo 2 su desktop e 1,5 su touch. Questa impostazione sostituisce il precedente rendering dell'arena a un terzo della risoluzione e quello dei testi touch a DPR 1. Rimangono sprite pixel art senza interpolazione, cache e limiti degli effetti. I quattro eroi e i quattro tipi di nemici hanno nuove sagome; i ritratti usano canvas più grandi e le vignette la risoluzione originale. Rimossa la sfocatura dei pannelli; le righe CRT sono disattivate per le nuove preferenze, restando selezionabili nelle impostazioni.

La campagna usa bollini circolari collegati, percorso a zigzag su desktop e verticale su telefono, con missione corrente dorata e missioni completate verdi. Le missioni e i salvataggi esistenti restano compatibili.

Ogni 10 eliminazioni consecutive riducono di 1 secondo la ricarica della super e di 0,5 secondi quella dello scatto. A fine ondata i tiratori avanzano invece di arretrare. Aggiunti lampi delle armi e suoni sintetici per ascia, danni, parate e cambi ondata; completato il ripiego audio per razzi, esplosioni, lame e boss. Tutti rispettano volume e mute.

Corretti i danni a distanza involontari nella difesa del generatore, la respinta diagonale dell'ascia, i colpi veloci che saltavano i bersagli e il superamento della destinazione dei cristalli attratti. Test di regressione: `node tests/refresh.cjs`. I test di simulazione includono ora anche il DOM delle impostazioni.

### Mappa scorrevole e assalti

Il mondo misura 2800 × 2200 unità, indipendentemente dal display. La telecamera segue l’eroe con scorrimento morbido su PC e telefono; ruotare il telefono mantiene le coordinate del personaggio e degli obiettivi. L’interfaccia touch ha pannelli compatti, testi leggibili, comandi separati e margini per le aree sicure del telefono. Una freccia indica l’obiettivo più vicino fuori dalla visuale.

I boss, le ondate 10–12 dell’Arcade e le ultime ondate delle missioni inviano gruppi da 8–12 nemici con intervalli ridotti, fino a 360 nemici contemporanei. I boss arrivano con 32 predoni e chiamano altri rinforzi ogni tre attacchi, raddoppiandoli quasi sotto metà vita. I nemici fuori dalla visuale continuano a muoversi, mentre i loro sprite non vengono disegnati.

La prima missione richiede tre segnali da decifrare restando nei cerchi per tre secondi ciascuno. I ripetitori distrutti scatenano imboscate e lasciano cure; le memorie richiedono 1,5 secondi di download, rivelano dialoghi e attirano predoni. Il generatore si ripara quando l’eroe è vicino e la zona è libera, con assalti periodici. Dopo le ondate e gli obiettivi bisogna raggiungere il faro verde di estrazione sotto un ultimo attacco. I progressi del capitolo restano compatibili.

Verifiche: `node tests/campaign.cjs`, `node tests/scrolling-arena.cjs`, `node tests/mobile.cjs`.

### Boss infiniti

Il pulsante **BOSS INFINITI** avvia una partita senza ultima ondata: Gorath, Mycelia e Omega si alternano, esattamente un boss per ondata. Ogni ondata aumenta la vita e i danni del boss; velocità, cadenza e velocità dei proiettili crescono gradualmente. Il menu e la barra del boss mostrano modalità e potenza corrente. Riprova ricomincia nella stessa modalità.

Gli assalti partono con 90 rinforzi e gruppi da 18–26 nemici, fino a 700 presenze contemporanee. I boss chiamano altri 30 rinforzi ogni tre attacchi, 48 in furia. Scaduto il tempo cessano tutti i rinforzi: elimina boss e superstiti per continuare, recuperare 12 punti vita e ricaricare lo scatto. Anche le prime ondate ordinarie hanno gruppi più numerosi (da 5 a 10).

Verifica: `node tests/boss-mode.cjs` copre boss unico, progressione oltre la dodicesima ondata, crescita fino all’ondata 100, limite dell’orda, fine rinforzi, HUD e riprova.
