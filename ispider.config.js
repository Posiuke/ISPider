/**
 * ISPider Konfigurationsdatei
 * ─────────────────────────────────────────────────────────────────────────────
 * Passe diese Werte an deine Umgebung an.
 * Die Datei wird vor main.js geladen und setzt window.ISPIDER_CONFIG.
 *
 * HINWEIS: Trage hier KEINE Produktions-API-Schlüssel in Klartext ein.
 *          Nutze stattdessen einen Backend-Proxy oder Umgebungsvariablen.
 */

window.ISPIDER_CONFIG = {

  // ── LLM / KI-Modell ──────────────────────────────────────────────────────
  llm: {
    /**
     * HTTP-Endpunkt deines LLM-Servers.
     * Unterstützte Formate:
     *   – OpenAI-kompatibel : 'https://api.openai.com/v1/chat/completions'
     *   – Ollama lokal       : 'http://localhost:11434/api/chat'
     *   – Hauseigener Server : 'https://llm.intranet.example.com/v1/chat/completions'
     */
    endpoint: 'http://localhost:11434/api/chat',

    /**
     * Modellname, der an den Server übermittelt wird.
     * Beispiele: 'llama3', 'mistral', 'gpt-4o', 'custom-isa-model'
     */
    model: 'llama3',

    /**
     * API-Schlüssel für authentifizierte Endpunkte.
     * Leer lassen (''), wenn der Server keine Authentifizierung erfordert.
     */
    apiKey: '',

    /**
     * System-Prompt: Beschreibt dem Agenten seine Rolle und das erwartete
     * Ausgabeformat (JSON). Dieser Text wird bei jedem LLM-Aufruf mitgesendet.
     *
     * WICHTIG – Ausgabeformat:
     * Der Agent MUSS immer ein gültiges JSON-Objekt zurückgeben, das eines oder
     * mehrere der folgenden Felder enthält:
     *
     *   {
     *     "message"      : "<Antworttext an den Nutzer (string)>",
     *     "requirements" : ["<Requirement 1>", "<Requirement 2>", ...],
     *     "scenario"     : {
     *       "flights": [
     *         {
     *           "id"    : "<eindeutige ID>",
     *           "label" : "<Anzeigename>",
     *           "track" : [
     *             { "lat": 50.03, "lon": 8.56 },
     *             { "lat": 48.35, "lon": 11.78 }
     *           ],
     *           "meta"  : { "route": "FRA→MUC", "aircraft": "A320" }
     *         }
     *       ]
     *     },
     *     "status"       : "<Statustext für die Statuszeile (string)>"
     *   }
     *
     * Fehlende Felder werden ignoriert. Antworte NUR mit dem JSON-Objekt,
     * ohne Markdown-Codeblöcke oder weiteren Text darum herum.
     */
    systemPrompt: `Du bist der ISPider Analyzing Agent. Deine Aufgabe ist es, Nutzerbeschreibungen von Flugplan-Szenarien zu analysieren, Requirements zu extrahieren und strukturierte Flugtrack-Daten zu erzeugen.

AUSGABEFORMAT (strikt einzuhalten):
Antworte ausschließlich mit einem JSON-Objekt. Kein Markdown, keine Erklärungen außerhalb des JSON.

{
  "message": "<deine Antwort an den Nutzer>",
  "requirements": ["<Requirement 1>", "<Requirement 2>"],
  "scenario": {
    "flights": [
      {
        "id": "<uuid-oder-eindeutige-id>",
        "label": "<Bezeichnung des Flugs>",
        "track": [
          { "lat": <breitengrad>, "lon": <längengrad> },
          ...
        ],
        "meta": {
          "route": "<Abflug→Ziel>",
          "aircraft": "<Flugzeugtyp>",
          "date": "<Datum ISO 8601>"
        }
      }
    ]
  },
  "status": "<kurze Statusmeldung>"
}

REGELN:
- Extrahiere aus der Nutzereingabe ALLE erkennbaren Requirements (Route, Fluggerät, Zeitraum, Mission, Constraints).
- Wenn du einen konkreten Flugtrack generierst, gib mindestens 8 Track-Punkte an (Großkreis-Route empfohlen).
- Breitengrad (lat): -90 bis +90. Längengrad (lon): -180 bis +180.
- Fehlen noch Informationen, fordere sie beim Nutzer an (in "message"), ohne ein Szenario zu erzeugen.
- Verwende deutsche Sprache für "message" und "status".`,
  },

  // ── Export ───────────────────────────────────────────────────────────────
  export: {
    /**
     * Standard-Dateiname/-Pfad für den Szenario-Export.
     * Die Dateiendung '.scenario' wird automatisch ergänzt, falls fehlend.
     * Beispiele: 'ausgabe/mein-szenario', 'ispider-export'
     */
    path: 'ispider-szenario.scenario',
  },

  // ── Optionaler externer Adapter ──────────────────────────────────────────
  // Kommentiere diesen Block ein, um einen eigenen JavaScript-Adapter zu
  // registrieren (überschreibt den eingebauten LLM-Adapter).
  //
  // adapter: {
  //   async handleInputMessage(inputMessage, snapshot) { ... },
  //   async runCuratorSearch(requirements, snapshot)  { ... },
  //   async exportScenario({ path, payload, state })  { ... },
  //   async resetSession(snapshot)                    { ... },
  // },
}
