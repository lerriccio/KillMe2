# Materiali dello store

- `icon-512.png`: icona 512×512, derivata dalla grafica originale di Axiom.
- `it-feature-1024x500.png`, `en-feature-1024x500.png`: feature graphic localizzate, 1024×500.
- `it-gameplay-1.png` … `it-gameplay-3.png`, e corrispondenti `en-`: schermate 1920×1080 ottenute usando i normali comandi del gioco, senza alterare salute, punteggio o nemici.
- `gameplay-preview.webm`: breve registrazione silenziosa di una partita reale. Controllare il montaggio e caricarla su un servizio supportato da Google Play prima di inserirne il link nella scheda.

Sono catture della versione browser. Le prove della versione Android e le anteprime definitive della Play Console restano da fare. Nessuna immagine afferma una valutazione o un numero di download.

Rigenerazione: `node tools/capture-store.cjs`. Per il video, l’encoder di Playwright deve essere disponibile in `.tools/playwright`: impostare `PLAYWRIGHT_BROWSERS_PATH` a tale cartella ed eseguire il comando `playwright install ffmpeg` del runtime locale. Gli strumenti restano esclusi da Git.
