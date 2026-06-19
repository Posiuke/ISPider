# ISPider

Frontend-Prototyp für den ISPider Multi-Agenten-Workflow zur iterativen Erstellung von Flugplan-Szenarien.

## Entwicklung

```bash
npm install
npm run dev
npm run build
```

## Enthaltene UI-Schnittstellen

- Dominante Weltkarte mit Track-Visualisierung für Szenarien
- Chat Window für `input_message` an den Analyzing Agent
- Requirements Window mit Live-Stand der Such-Constraints
- Aktionen für `Start Search`, `Export Scenario` und `Reset Session`
- Browser-Export als `.scenario`-Datei mit vorgeschlagenem Dateinamen/Pfad

## Bridge für spätere Agenten-Integration

Nach dem Laden steht `window.ISPIDER_APP` bereit:

- `receiveAgentMessage(content)`
- `updateRequirements(requirements)`
- `updateScenario(payload, { append })`
- `replaceScenario(payload)`
- `resetSession()`
- `getState()`

Optional kann vor dem App-Start ein Adapter via `window.ISPIDER_CONFIG = { adapter: ... }` eingebunden werden, der die Methoden `handleInputMessage`, `runCuratorSearch`, `exportScenario`, `resetSession` und `attach` implementiert.
