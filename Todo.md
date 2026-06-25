# Todo List - Software Gestionale per Agronomi e Aziende Agricole

## Fase 1: Setup e Infrastruttura

- [x] Setup progetto React/Vite (Vite 7, React 18, configurazione completata)
- [x] Configurazione database Supabase (schema SQL, client configurato, RLS attivo)
- [x] Setup autenticazione e autorizzazione (LoginScreen, session management, RLS policies)
- [x] Configurazione routing (react-router-dom v7 con route protette, Layout con Outlet)

## Fase 2: MVP - Moduli Prioritari

### 2.1 Aziende Agricole

- [x] CRUD anagrafica aziende (CompanyProfile con notebookService - Supabase)
- [x] Gestione proprietari e tecnici (owner_name, referente aziendale)
- [x] Gestione operatori e fornitori (authorized_operators array, CRUD completo)
- [ ] Gestione clienti, cooperative e consorzi
- [ ] Documentazione aziendale (allegati, certificazioni)

### 2.2 Appezzamenti

- [x] CRUD appezzamenti (FarmlandScreen + useFarmlands hook - Supabase)
- [x] Dati catastali (foglio, particella) (cadastralParcel field nel form)
- [x] Integrazione mappe GIS (OpenLayers, DrawableMap, mappe interattive)
- [x] Geolocalizzazione e confini (useGeolocation, coordinate poligoni)
- [ ] Analisi terreno (tessitura, pH, sostanza organica, NPK)
- [ ] Storico analisi terreno

### 2.3 Colture

- [x] CRUD colture e varietà (crop_history table + currentCrop field)
- [x] Gestione ciclo colturale (crop_history con date inizio/fine)
- [x] Rotazione colturale e storico (cropHistory UI in FarmlandScreen)
- [x] Monitoraggio stato coltura (currentCrop, ciclo da semina a raccolta)

### 2.4 Quaderno di Campagna

- [x] Registrazione interventi (OperationsManager - 10 tipi operazione)
- [x] Dettaglio intervento (data, operatore, appezzamento, coltura, macchinario, durata, note, allegati, condizioni meteo)
- [x] Storico interventi (filtri per data, operatore, prodotto; tab "Tutte le attività")
- [x] Gestione prodotti collegati e quantità

### 2.5 Trattamenti Fitosanitari

- [x] Archivio prodotti fitosanitari (FitosanitariScreen - dati da opendata Ministero Salute, salvataggio su IndexedDB)
- [x] Controlli automatici (tempi di carenza, dose per ettaro nei trattamenti)
- [x] Registrazione trattamenti con costi (OperationsManager - trattamento fitosanitario)
- [x] Piano di fertilizzazione (tipo "Concimazione" in OperationsManager)

### 2.6 Magazzino

- [x] Categorie merceologiche (Fitosanitario, Concime, Biostimolante, Altro)
- [x] Gestione carico/scarico (ProductInventory CRUD su Supabase)
- [x] Inventario e giacenze (anagrafica prodotti)
- [ ] Gestione lotti e scadenze (batch_number e expiry_date esistenti, manca alert e movimenti)
- [ ] Alert sottoscorta e scadenze

### 2.7 Raccolte

- [ ] Registrazione raccolta dedicata (data, appezzamento, coltura, quantità, qualità)
- [ ] Tracciabilità lotti produzione
- [ ] Destinazione prodotto e clienti finali

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
- [ ] Indicatori (costo/ettaro, produzione/ettaro, margine lordo, redditività per coltura)

### 3.5 Agenda e Scadenze

- [x] Promemoria (tab "Agenda (Pianificate)" in OperationsManager per attività future)
- [ ] Notifiche (email, SMS, push)

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
- [ ] Alert meteo (gelate, grandine, siccità, piogge intense)

### 5.2 GIS e Cartografia

- [x] Visualizzazione mappe satellitari (OpenLayers con provider OSM, Esri, MapTiler, Thunderforest)
- [x] Layer catastali (WMS Agenzia Entrate con proiezione EPSG:6706)
- [x] Layer satellitari (Sentinel-2 Cloudless EOX)
- [x] Geolocalizzazione interventi (coordinate poligoni appezzamenti)
- [ ] Disegno appezzamenti manuale (DrawableMap esistente)

### 5.3 Sensori IoT

- [ ] Monitoraggio umidità terreno, temperatura, pioggia, livello serbatoi
- [ ] Automazioni (avvio irrigazione, allarmi)

### 5.4 Intelligenza Artificiale

- [ ] Riconoscimento malattie da foto
- [ ] Suggerimento trattamenti
- [ ] Previsione raccolto
- [ ] Analisi anomalie produttive
- [ ] Chat AI agronomica
