# Todo List - Software Gestionale per Agronomi e Aziende Agricole

## Istruzioni operative

Questo file è la lista operativa per realizzare quanto descritto in `RelazioneConAgronomo.md`.

- Inserire qui le future istruzioni dell'utente prima di iniziare una nuova attività.
- Collegare ogni istruzione alla voce pertinente della roadmap, aggiungendo sotto-attività e criteri di completamento verificabili.
- Considerare `RelazioneConAgronomo.md` come riferimento funzionale; in caso di contrasto prevalgono le istruzioni più recenti presenti in questo file.
- Implementare una sola attività alla volta, partendo dalla prima voce prioritaria non completata per cui siano disponibili istruzioni sufficienti.
- Non dedurre requisiti normativi, formule, fonti dati, credenziali o infrastrutture mancanti: registrarli come informazioni necessarie prima dell'implementazione.
- Al termine, segnare come completate solo le attività effettivamente implementate e annotare i file modificati e la verifica manuale richiesta.

### Istruzioni future dell'utente

<!-- Aggiungere qui le nuove istruzioni, mantenendole in ordine cronologico e indicando la voce della roadmap a cui si riferiscono. -->

- [x] Aggiungere nella griglia fitosanitari il collegamento all'etichetta PDF ministeriale solo per i prodotti attivi.

## Priorità da RelazioneConAgronomo

### R1. Ottimizzazione catasto

- [ ] Definire formato, provenienza, licenza e aggiornamento mensile del database catastale.(questa operazione verrà fatta tramite script nodejs che vengono schedulati in un'altro server ed inseriscono in db i nuovi dati)
- [ ] Strutturare la ricerca per Provincia, Comune, Foglio e Mappale.
- [ ] Collegare più mappali a un singolo appezzamento agronomico senza perdere gli identificativi catastali.(attualmente abbiamo la logica, un azienda ha più terreni. dovremmo portare la logica in un azienda ha più terreni, ogni terreno può avere più identificativi catastali, un identificativo catastale può avere più terreni)
- [ ] Definire e verificare il criterio prestazionale per la ricerca sub-secondo.
- [x] Importazione assistita da contenuto XLS con anteprima mappali, assegnazione terreni, colture e SAU
- [x] Ripartizione manuale delle superfici CSV tra più terreni con vincolo di una coltura per campagna

### R2. Parser AI delle etichette fitosanitarie

- [x] Definire sorgente e modalità di acquisizione delle etichette PDF del Ministero della Salute (script Node con ricerca per numero registrazione).
- [x] Estrarre con OCR locale e OpenRouter colture autorizzate, dosi minime/massime, tempi di carenza e intervalli tra trattamenti, predisponendo revisione manuale.
- [ ] Estrarre il contenuto di rame e calcolare il totale annuo per ettaro tra prodotti diversi (estrazione rame predisposta; calcolo annuale ancora da implementare).
- [ ] Prevedere revisione manuale e tracciabilità del dato estratto prima dell'uso operativo.

### R3. Motore di compliance

- [ ] Importare e normalizzare lo storico colturale quinquennale dal Fascicolo Aziendale Excel.
- [ ] Verificare la presenza di almeno tre colture diverse nel quinquennio.
- [ ] Segnalare più di un ristoppio consecutivo per coltura con alert non bloccante.
- [ ] Tracciare annualmente SAU dichiarata, SAU rilevata e relativa variazione percentuale.
- [ ] Definire con l'agronomo regole, deroghe e testi degli alert prima dell'implementazione normativa.
- [x] Predisporre nome terreno, identificazioni catastali molti-a-molti e SAU annuale con riepilogo quinquennale dalla mappa

### R4. Layer ZVN e fasce tampone

- [ ] Identificare fonti cartografiche regionali ufficiali, formati e frequenza di aggiornamento.
- [ ] Classificare gli appezzamenti come ZVN o non ZVN tramite intersezione geografica.
- [ ] Applicare i limiti configurabili di azoto organico e il coefficiente di efficienza agronomica.
- [ ] Individuare corpi idrici e fasce tampone, mostrando alert non bloccanti sugli spandimenti.

### R5. Tracciabilità e DDT

- [ ] Collegare raccolte e lotti ai mappali, allo storico trattamenti e alle analisi del terreno.
- [ ] Definire i dati obbligatori e il modello del DDT con il partner di filiera.
- [ ] Generare il DDT dai dati reali di raccolta evitando duplicazioni manuali.
- [ ] Pianificare il beta-test con partner industriali e registrare criteri ed esito della validazione.

## Fase 1: Setup e Infrastruttura

- [x] Setup progetto React/Vite (Vite 7, React 18, configurazione completata)
- [x] Configurazione database Supabase (schema SQL, client configurato, RLS attivo)
- [x] Setup autenticazione e autorizzazione (LoginScreen, session management, RLS policies)
- [x] Configurazione routing (react-router-dom v7 con route protette, Layout con Outlet)

## Fase 2: MVP - Moduli Prioritari

### 2.1 Aziende Agricole

- [x] CRUD anagrafica aziende (CompanyProfile con notebookService - Supabase)
- [x] Gestione proprietari e tecnici (CompanyWorkspace + CompanyContactsPage con category owner/technician su Supabase)
- [x] Gestione operatori e fornitori (CompanyWorkspace + CompanyContactsPage con category operator/supplier su Supabase)
- [x] Gestione clienti, cooperative e consorzi (CompanyWorkspace + CompanyContactsPage con category client/cooperative/consortium su Supabase)
- [x] Documentazione aziendale (metadati, link allegati e certificazioni con CompanyDocumentsPage su Supabase; upload file fisico non ancora implementato)

### 2.2 Appezzamenti

- [x] CRUD appezzamenti (FarmlandScreen + useFarmlands hook - Supabase)
- [ ] Dati catastali (foglio, particella) (presente solo campo testuale cadastralParcel, non strutturato)
- [x] Integrazione mappe GIS (OpenLayers, DrawableMap, mappe interattive)
- [x] Geolocalizzazione e confini (useGeolocation, coordinate poligoni)
- [x] Analisi terreno (tessitura, pH, sostanza organica, NPK) (FarmlandScreen con campi data, tessitura, pH, sostanza organica, NPK e note)
- [x] Storico analisi terreno (tabella storico in FarmlandScreen con inserimento ed eliminazione analisi)

### 2.3 Colture

- [ ] CRUD colture e varietÃ  (presente gestione coltura corrente e storico colture in FarmlandScreen; manca gestione anagrafica/CRUD varietÃ  dedicata)
- [x] Gestione ciclo colturale (crop_history con date inizio/fine)
- [x] Rotazione colturale e storico (cropHistory UI in FarmlandScreen)
- [x] Monitoraggio stato coltura (currentCrop, ciclo da semina a raccolta)

### 2.4 Quaderno di Campagna

- [x] Registrazione interventi (OperationsManager - 10 tipi operazione)
- [ ] Dettaglio intervento (mancano durata e allegati reali; presente solo attachment_url)
- [x] Storico interventi (filtri per data, operatore, prodotto; tab "Tutte le attivitÃ ")
- [x] Gestione prodotti collegati e quantitÃ 

### 2.5 Trattamenti Fitosanitari

- [x] Archivio prodotti fitosanitari (FitosanitariScreen - dati da opendata Ministero Salute, salvataggio su IndexedDB)
- [x] Download della singola etichetta PDF tramite proxy ministeriale per i soli prodotti attivi (FitosanitariScreen)
- [x] Griglia fitosanitari da Supabase con dati estratti, filtri e preferenze colonne in localStorage
- [x] Script Node in comandi separati per download PDF, conversione immagini, OCR locale ed estrazione AI
- [x] Controlli automatici (tempi di carenza, dose per ettaro nei trattamenti) (OperationsManager calcola dose attesa per appezzamento, segnala scostamenti e mostra la fine del tempo di carenza)
- [x] Registrazione trattamenti con costi (OperationsManager - trattamento fitosanitario)
- [x] Piano di fertilizzazione (modulo dedicato in FarmlandScreen con righe collegate all'appezzamento e prefill dall'ultima analisi terreno)

### 2.6 Magazzino

- [x] Categorie merceologiche (Fitosanitario, Concime, Biostimolante, Altro)
- [x] Gestione carico/scarico (ProductInventory CRUD su Supabase)
- [x] Inventario e giacenze (anagrafica prodotti)
- [x] Gestione lotti e scadenze (ProductInventory gestisce lotti aziendali, quantità iniziali, movimenti per lotto e date di scadenza)
- [x] Alert sottoscorta e scadenze (ProductInventory mostra alert per lotti in scadenza e prodotti sotto scorta minima aziendale)

### 2.7 Raccolte

- [x] Registrazione raccolta dedicata (data, appezzamento, coltura, quantitÃ , qualitÃ )
- [x] TracciabilitÃ  lotti produzione
- [x] Destinazione prodotto e clienti finali

### 2.8 Dashboard

- [ ] Indicatori principali (colture attive, interventi da eseguire, prodotti in scadenza, costi mese, produzione prevista)
- [ ] KPI (ettari coltivati, produzione totale, costi totali, ricavi totali, margine operativo)

### 2.9 Report PDF

- [ ] Generazione report personalizzati
- [ ] Verbali sopralluogo
- [ ] Schede tecniche
- [ ] Report agronomici

## Fase 3: Moduli Secondari

### 3.1 Irrigazione

- [ ] Programmazione turni irrigui
- [ ] Monitoraggio consumi e costi
- [ ] Storico irrigazioni

### 3.2 Macchinari

- [ ] Anagrafica macchinari
- [ ] Gestione manutenzioni (ordinaria/straordinaria)
- [ ] Scadenze revisioni
- [ ] Costi manutenzione

### 3.3 Gestione Commerciale

- [ ] Gestione vendite e ordini
- [ ] Contratti e conferimenti
- [ ] Analisi prezzi e ricavi

### 3.4 Analisi Economica

- [ ] Costi diretti (sementi, concimi, fitofarmaci, carburante, manodopera)
- [ ] Costi indiretti (ammortamenti, assicurazioni, consulenze)
- [ ] Indicatori (costo/ettaro, produzione/ettaro, margine lordo, redditivitÃ  per coltura)

### 3.5 Agenda e Scadenze

- [x] Promemoria (tab "Agenda (Pianificate)" in OperationsManager per attivitÃ  future)
- [ ] Notifiche (email, SMS, push)

### 3.6 Modulo PAC

- [ ] Gestione fascicolo aziendale
- [ ] Import delle particelle AGEA/SIAN
- [ ] Verifica automatica dei requisiti PAC
- [ ] Controllo degli ecoschemi
- [ ] Verifica delle BCAA (Buone Condizioni Agronomiche e Ambientali)
- [ ] Simulazione dei contributi ottenibili
- [ ] Checklist dei documenti mancanti
- [ ] Report pronti per CAA e agronomi

## Fase 4: Modulo Agronomo

- [ ] Elenco aziende seguite
- [ ] Visite tecniche e relazioni
- [ ] Prescrizioni operative
- [ ] Reportistica avanzata
- [ ] Firma digitale

## Fase 5: Moduli Avanzati

### 5.1 Integrazione Meteo

- [ ] Previsioni locali
- [ ] Storico precipitazioni e temperature
- [ ] Alert meteo (gelate, grandine, siccitÃ , piogge intense)

### 5.2 GIS e Cartografia

- [x] Visualizzazione mappe satellitari (OpenLayers con provider OSM, Esri, MapTiler, Thunderforest)
- [x] Layer catastali (WMS Agenzia Entrate con proiezione EPSG:6706)
- [x] Layer satellitari (Sentinel-2 Cloudless EOX)
- [ ] Geolocalizzazione interventi (presenti coordinate degli appezzamenti, non dei singoli interventi)
- [ ] Disegno appezzamenti manuale (DrawableMap esistente)
- [x] Vista aziendale con tutti i terreni evidenziati sulla stessa mappa

### 5.3 Sensori IoT

- [ ] Monitoraggio umiditÃ  terreno, temperatura, pioggia, livello serbatoi
- [ ] Automazioni (avvio irrigazione, allarmi)

### 5.4 Intelligenza Artificiale

- [ ] Riconoscimento malattie da foto
- [ ] Suggerimento trattamenti
- [ ] Previsione raccolto
- [ ] Analisi anomalie produttive
- [ ] Chat AI agronomica
