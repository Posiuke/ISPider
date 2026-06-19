# ISPider – Schnittstellendokumentation

> **Zielgruppe:** Entwickler, die ISPider mit einem hauseigenen LLM oder einem externen Backend verbinden.

---

## Inhaltsverzeichnis

1. [Konfiguration (`ispider.config.js`)](#1-konfiguration)
2. [LLM-Adapter – Kommunikationsprotokoll](#2-llm-adapter--kommunikationsprotokoll)
3. [JavaScript-Bridge (`window.ISPIDER_APP`)](#3-javascript-bridge)
4. [Externer Adapter](#4-externer-adapter)
5. [Szenario-Datenformat](#5-szenario-datenformat)
6. [Ereignisse (`CustomEvent`)](#6-ereignisse)
7. [Plotly-Karte](#7-plotly-karte)

---

## 1. Konfiguration

Die Datei **`ispider.config.js`** im Wurzelverzeichnis setzt `window.ISPIDER_CONFIG` und wird
vor `main.js` geladen. Alle Felder sind optional – fehlende Werte werden durch interne
Standardwerte ersetzt.

```js
window.ISPIDER_CONFIG = {
  llm: {
    endpoint:     'http://localhost:11434/api/chat',  // HTTP-Endpunkt des LLM
    model:        'llama3',                           // Modellname
    apiKey:       '',                                 // API-Schlüssel (falls benötigt)
    systemPrompt: '...',                              // System-Prompt (s. Abschnitt 2)
  },
  export: {
    path: 'ispider-szenario.scenario',                // Export-Dateiname
  },
  // adapter: { ... }  // optionaler JS-Adapter (s. Abschnitt 4)
}
```

### Priorität der Adapter

```
ISPIDER_CONFIG.adapter  →  ISPIDER_CONFIG.llm.endpoint  →  Mock-Adapter (intern)
```

---

## 2. LLM-Adapter – Kommunikationsprotokoll

Wenn `ISPIDER_CONFIG.llm.endpoint` gesetzt ist, ruft ISPider das LLM über HTTP auf.

### 2.1 HTTP-Anfrage

**Methode:** `POST`  
**Endpunkt:** `ISPIDER_CONFIG.llm.endpoint`  
**Header:**

| Header            | Wert                        | Pflicht?                    |
|-------------------|-----------------------------|-----------------------------|
| `Content-Type`    | `application/json`          | Ja                          |
| `Authorization`   | `******           | Nur wenn `apiKey` gesetzt   |

**Body (OpenAI-kompatibel):**

```json
{
  "model": "llama3",
  "stream": false,
  "messages": [
    { "role": "system",    "content": "<systemPrompt>" },
    { "role": "user",      "content": "<letzte Nutzernachricht 1>" },
    { "role": "assistant", "content": "<Agenten-Antwort 1>" },
    { "role": "user",      "content": "<aktuelle Nutzernachricht>" }
  ]
}
```

> ISPider sendet maximal die letzten **8 Nachrichten** des Chatverlaufs plus die aktuelle Nachricht.

### 2.2 HTTP-Antwort

ISPider unterstützt zwei Antwortformate:

**OpenAI-Format:**
```json
{
  "choices": [
    { "message": { "role": "assistant", "content": "<JSON-String>" } }
  ]
}
```

**Ollama-Format:**
```json
{
  "message": { "role": "assistant", "content": "<JSON-String>" }
}
```

### 2.3 Pflichtformat der LLM-Ausgabe

Der **`content`-Wert** der Antwort **muss ein JSON-Objekt** sein. Der Agent darf es in einem
Markdown-Codeblock (`` ```json … ``` ``) einschließen – ISPider extrahiert es automatisch.

```json
{
  "message":      "<Antworttext an den Nutzer (string)>",
  "requirements": ["<Requirement 1>", "<Requirement 2>"],
  "scenario": {
    "flights": [
      {
        "id":    "<eindeutige ID (string)>",
        "label": "<Anzeigename (string)>",
        "track": [
          { "lat": 50.03, "lon": 8.56 },
          { "lat": 51.50, "lon": 0.45 }
        ],
        "meta": {
          "route":    "FRA→LHR",
          "aircraft": "A320",
          "date":     "2025-09-15"
        }
      }
    ]
  },
  "status": "<kurze Statusmeldung (string)>"
}
```

| Feld           | Typ             | Pflicht | Beschreibung                                   |
|----------------|-----------------|---------|------------------------------------------------|
| `message`      | `string`        | Nein    | Antworttext, der im Chat angezeigt wird        |
| `requirements` | `string[]`      | Nein    | Vollständige neue Requirements-Liste           |
| `scenario`     | `ScenarioObj`   | Nein    | Flugtracks zur Visualisierung auf der Karte    |
| `status`       | `string`        | Nein    | Text für die Statuszeile (unten an der Karte)  |

> **Wichtig:** Fehlende Felder werden ignoriert. Der Agent muss **nur die Felder zurückgeben,
> die sich tatsächlich geändert haben**.

---

## 3. JavaScript-Bridge

Externe Systeme (z. B. ein Python-Backend über WebSocket) können die App über
`window.ISPIDER_APP` steuern, sobald das Ereignis `ispider:ready` ausgelöst wurde.

### Methoden

#### `ISPIDER_APP.receiveAgentMessage(content: string): void`
Fügt eine Agenten-Nachricht in den Chat ein.

```js
window.ISPIDER_APP.receiveAgentMessage('Ich habe 3 Flüge gefunden.')
```

---

#### `ISPIDER_APP.updateRequirements(requirements: string[]): void`
Ersetzt die Requirements-Liste vollständig.

```js
window.ISPIDER_APP.updateRequirements(['Route: FRA→JFK', 'Datum: 2025-09-15'])
```

---

#### `ISPIDER_APP.updateScenario(payload, options?): void`
Fügt neue Flüge zum Szenario hinzu (append-Modus, Standard).

```js
window.ISPIDER_APP.updateScenario({
  flights: [{
    id: 'fl-001',
    label: 'LH401',
    track: [{ lat: 50.03, lon: 8.56 }, { lat: 40.64, lon: -73.78 }],
    meta: { route: 'FRA→JFK', aircraft: 'A380' }
  }]
})
```

**`options`:**

| Feld     | Typ       | Standard | Beschreibung                             |
|----------|-----------|----------|------------------------------------------|
| `append` | `boolean` | `true`   | `false` = bestehende Flüge ersetzen      |

---

#### `ISPIDER_APP.replaceScenario(payload): void`
Ersetzt das gesamte Szenario (Kurzform für `updateScenario(payload, { append: false })`).

---

#### `ISPIDER_APP.resetSession(): Promise<void>`
Setzt Nachrichten, Requirements und Szenario zurück.

---

#### `ISPIDER_APP.getState(): StateSnapshot`
Gibt einen tiefen Snapshot des aktuellen Zustands zurück.

```ts
interface StateSnapshot {
  messages:     { role: 'user' | 'assistant'; content: string; timestamp: string }[]
  requirements: string[]
  scenario:     { flights: Flight[] }
  exportPath:   string
  status:       string
}
```

---

## 4. Externer Adapter

Für vollständige Backend-Integration kann ein **JavaScript-Adapter** in
`ispider.config.js` registriert werden. Er hat Vorrang vor dem LLM-Adapter.

```js
window.ISPIDER_CONFIG = {
  adapter: {
    /**
     * Wird aufgerufen, wenn der Nutzer eine Chat-Nachricht sendet.
     * @param {string} inputMessage  – Die Nachricht des Nutzers
     * @param {StateSnapshot} snapshot – Aktueller App-Zustand
     * @returns {Promise<AgentResult>}
     */
    async handleInputMessage(inputMessage, snapshot) {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: inputMessage, state: snapshot }),
      })
      return response.json()  // Muss AgentResult-Format zurückgeben
    },

    /**
     * Wird aufgerufen, wenn "Start Search" geklickt wird.
     * @param {string[]} requirements  – Aktuelle Requirements-Liste
     * @param {StateSnapshot} snapshot – Aktueller App-Zustand
     * @returns {Promise<AgentResult>}
     */
    async runCuratorSearch(requirements, snapshot) {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirements, state: snapshot }),
      })
      return response.json()
    },

    /**
     * Optional – wird beim Export-Button aufgerufen.
     * Gibt { download: false } zurück, um den Browser-Download zu unterdrücken.
     * @param {{ path: string, payload: object, state: StateSnapshot }} params
     * @returns {Promise<{ status?: string, download?: boolean }>}
     */
    async exportScenario({ path, payload, state }) {
      await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, payload }),
      })
      return { status: `Exportiert nach ${path}`, download: false }
    },

    /**
     * Optional – wird beim Reset aufgerufen.
     */
    async resetSession(snapshot) {
      await fetch('/api/reset', { method: 'POST' })
    },
  }
}
```

### `AgentResult`-Format

Identisch mit dem JSON-Ausgabeformat des LLM (s. [Abschnitt 2.3](#23-pflichtformat-der-llm-ausgabe)).

---

## 5. Szenario-Datenformat

ISPider akzeptiert Flugtrack-Daten in verschiedenen Formaten – alle werden intern normalisiert.

### Format A – Standard (empfohlen)

```json
{
  "flights": [
    {
      "id":    "flight-001",
      "label": "LH401",
      "track": [
        { "lat": 50.03, "lon": 8.56 },
        { "lat": 51.50, "lon": 0.45 }
      ],
      "meta": { "route": "FRA→LHR" }
    }
  ]
}
```

### Format B – Spaltenbasiert (Pandas-DataFrame-kompatibel)

```json
{
  "flights": [
    {
      "id":       "flight-001",
      "label":    "LH401",
      "track": {
        "lat":      [50.03, 51.50],
        "lon":      [8.56, 0.45],
        "altitude": [0, 35000, 35000, 0]
      }
    }
  ]
}
```

### Format C – Flat Array

```json
[
  { "lat": 50.03, "lon": 8.56 },
  { "lat": 51.50, "lon": 0.45 }
]
```

### Unterstützte Feldnamen für Koordinaten

| Breitengrad                               | Längengrad                                          |
|-------------------------------------------|-----------------------------------------------------|
| `lat`, `latitude`, `latitude_deg`, `Latitude` | `lon`, `lng`, `long`, `longitude`, `longitude_deg`, `Longitude` |

---

## 6. Ereignisse

ISPider löst folgende `CustomEvent`s auf `window` aus:

| Ereignis         | Zeitpunkt                                  |
|------------------|--------------------------------------------|
| `ispider:ready`  | Nach vollständiger Initialisierung der App |

**Verwendung:**

```js
window.addEventListener('ispider:ready', () => {
  console.log('App bereit:', window.ISPIDER_APP.getState())
})
```

---

## 7. Plotly-Karte

ISPider nutzt **Plotly.js** (`plotly.js-dist-min`) zur Darstellung einer interaktiven
Weltkarte mit dem Kartotyp `scattergeo` und der Projektion **Natural Earth**.

### Unterstützte Interaktionen

| Aktion             | Ergebnis                                        |
|--------------------|-------------------------------------------------|
| Klick auf Track    | Selektiert den Flug, hebt ihn hervor            |
| Klick auf Karte    | (Standard Plotly: Pan/Zoom)                     |
| Mausrad / Pinch    | Zoom                                            |
| Hover über Punkt   | Tooltip mit Koordinaten und Flugbezeichnung     |

### Plotly-Figur aus Python übergeben

Wenn das Python-Backend eine Plotly-Figur erzeugt, können deren Traces direkt in das
Szenario-Format konvertiert werden:

```python
import plotly.graph_objects as go
import json

fig = go.Figure(go.Scattergeo(
    lat=[50.03, 51.50],
    lon=[8.56, 0.45],
    mode='lines+markers',
    name='LH401'
))

# Traces in ISPider-Format konvertieren
flights = []
for trace in fig.data:
    flights.append({
        "id":    trace.name,
        "label": trace.name,
        "track": [{"lat": lat, "lon": lon}
                  for lat, lon in zip(trace.lat, trace.lon)],
        "meta":  {}
    })

payload = json.dumps({"flights": flights})
# payload an ISPIDER_APP.updateScenario() übergeben (z.B. über WebSocket)
```
