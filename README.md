# ISPider

Frontend-Prototyp für den ISPider Multi-Agenten-Workflow zur iterativen Erstellung von Flugplan-Szenarien.

## Entwicklung

```bash
npm install
cp ispider.config.example.js ispider.config.js   # lokale Konfiguration anlegen
# ispider.config.js anpassen (LLM-Endpunkt, Modell, API-Schlüssel, Export-Pfad)
npm run dev
npm run build
```

## Konfiguration

Die Datei **`ispider.config.js`** (nicht im Git – aus `ispider.config.example.js` kopieren) steuert:

| Einstellung                  | Beschreibung                                           |
|------------------------------|--------------------------------------------------------|
| `llm.endpoint`               | HTTP-Endpunkt des LLM (OpenAI-kompatibel / Ollama)    |
| `llm.model`                  | Modellname, z. B. `llama3`, `gpt-4o`, eigenes Modell  |
| `llm.apiKey`                 | API-Schlüssel (leer lassen, wenn nicht benötigt)       |
| `llm.systemPrompt`           | System-Prompt mit erwartetem JSON-Ausgabeformat        |
| `export.path`                | Standard-Dateiname für den Szenario-Export             |

Vollständige Dokumentation: **[`docs/INTERFACES.md`](docs/INTERFACES.md)**

## Enthaltene UI-Schnittstellen

- **Plotly Weltkarte** (Natural-Earth-Projektion) mit interaktiver Track-Visualisierung
- **Chat Window** – Konversationsansicht (Nutzer rechts, Agent links), Enter = Senden
- **Requirements Window** mit Live-Stand der Such-Constraints
- **Aktionen** für `Start Search`, `Export Scenario` und `Reset Session`
- Browser-Export als `.scenario`-Datei (Dateiname aus `ispider.config.js`)

## Bridge für Agenten-Integration

Nach dem Laden steht `window.ISPIDER_APP` bereit:

- `receiveAgentMessage(content)`
- `updateRequirements(requirements)`
- `updateScenario(payload, { append })`
- `replaceScenario(payload)`
- `resetSession()`
- `getState()`

Optional kann in `ispider.config.js` ein vollständiger JavaScript-Adapter registriert werden
(`window.ISPIDER_CONFIG.adapter`) – Details in [`docs/INTERFACES.md`](docs/INTERFACES.md).
