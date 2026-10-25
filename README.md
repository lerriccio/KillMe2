# WILD BUNCH

Arena roguelite con grafica arcade 8 bit: quattro eroi e nemici disegnati con sprite originali a pixel, tre arene a tessere (canyon, bosco dei funghi e forgia), proiettili e super colpi pixellati. Il Canvas lavora a un terzo della risoluzione e viene ingrandito senza interpolazione. Menu, HUD, selezione eroi e finestre usano bordi squadrati, colori netti e un carattere bitmap originale salvato localmente. Una leggera trama a righe richiama lo schermo del cabinato.

Tre boss giganti alle ondate 4, 8 e 12: Gorath, Mycelia e Omega, con sprite distinti, barra della vita e attacchi più intensi sotto il 50% della vita. Le decorazioni delle arene non bloccano il movimento.

## Gioca

Fai doppio clic su **AVVIA WILD BUNCH.cmd** oppure **Play.cmd**. Il vecchio collegamento **AVVIA NEON REQUIEM.cmd** funziona ancora. Ogni apertura carica i file locali aggiornati, evitando la cache. Puoi anche aprire **index.html** in un browser moderno. Non occorre installare dipendenze. Il carattere Arcade Pixel è locale: la grafica non richiede connessione.

Scegli uno dei quattro eroi nel menu. La selezione cambia aspetto, vita, velocità, arma iniziale e super colpo:

| Eroe | Arma | Super colpo |
| --- | --- | --- |
| Axiom, androide da duello | Railgun Gemini: due fucili perforanti | Collasso di plasma: 32 lance potenziate |
| Vulkor, drago corazzato | Ascia Sismica: area di 165 px e respinta | Fractura tectonica: terremoto, danni e forte respinta |
| Bastion, mech cingolato | Obice Apocalisse: razzi con esplosioni di 125 px | Protocollo Apocalisse: esplosione e 12 missili radiali |
| Nyx, spettro del vuoto | Chakram Eclisse: lame rotanti a rimbalzo | Eclisse delle anime: 32 lame potenziate con cinque rimbalzi |

- WASD o frecce: movimento; mira e attacco automatici. Le raffiche mantengono un colpo sulla linea di mira anche con 4 proiettili e usano un cono stretto.
- I nemici arrivano in gruppi da 3 a 6, con frequenza crescente e un massimo di 260 presenze ordinarie contemporanee.
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
