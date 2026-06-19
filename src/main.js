import './style.css'

const MAP_WIDTH = 1000
const MAP_HEIGHT = 460
const AIRPORTS = {
  FRA: { label: 'Frankfurt', lat: 50.0379, lon: 8.5622 },
  MUC: { label: 'München', lat: 48.3538, lon: 11.7861 },
  BER: { label: 'Berlin', lat: 52.3667, lon: 13.5033 },
  LHR: { label: 'London', lat: 51.47, lon: -0.4543 },
  CDG: { label: 'Paris', lat: 49.0097, lon: 2.5479 },
  MAD: { label: 'Madrid', lat: 40.4722, lon: -3.5608 },
  JFK: { label: 'New York', lat: 40.6413, lon: -73.7781 },
  GRU: { label: 'São Paulo', lat: -23.4356, lon: -46.4731 },
  CPT: { label: 'Kapstadt', lat: -33.9696, lon: 18.5972 },
  DXB: { label: 'Dubai', lat: 25.2532, lon: 55.3657 },
  DEL: { label: 'Delhi', lat: 28.5562, lon: 77.1 },
  SIN: { label: 'Singapur', lat: 1.3644, lon: 103.9915 },
  HND: { label: 'Tokio', lat: 35.5494, lon: 139.7798 },
  SYD: { label: 'Sydney', lat: -33.9399, lon: 151.1753 },
}
const CONTINENTS = [
  'M110 82 L180 60 L248 78 L275 120 L252 168 L222 196 L174 188 L126 156 L96 116 Z',
  'M228 214 L262 236 L286 300 L272 382 L236 410 L220 350 L210 274 Z',
  'M430 86 L472 72 L534 80 L558 118 L530 140 L476 136 L438 120 Z',
  'M458 144 L512 154 L566 186 L604 266 L590 362 L532 394 L472 352 L446 272 L430 194 Z',
  'M588 88 L656 74 L756 98 L842 126 L886 182 L860 224 L786 214 L730 164 L676 154 L618 142 Z',
  'M772 304 L836 326 L864 372 L816 398 L752 372 L740 332 Z',
]

const state = {
  messages: [
    {
      role: 'assistant',
      content:
        'Willkommen bei ISPider. Beschreibe dein gewünschtes Flugplan-Szenario – ich halte Requirements aktuell und bereite die Suche vor.',
      timestamp: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
    },
  ],
  requirements: [],
  scenario: { flights: [] },
  selectedFlightId: null,
  isAnalyzing: false,
  isSearching: false,
  exportPath: 'ispider-szenario.scenario',
  status: 'Sitzung bereit',
}

const app = document.querySelector('#app')
const adapter = createAdapter()

app.innerHTML = `
  <main class="app-shell">
    <section class="panel map-panel">
      <div class="panel-header map-header">
        <div>
          <p class="eyebrow">Interactive scenario canvas</p>
          <h1>ISPider Flight Scenario Builder</h1>
          <p class="subtitle">Dominante Weltkarte für Schritt-für-Schritt-Szenarien aus Agenten-Workflows.</p>
        </div>
        <div class="brand-badge" aria-label="ISPider Logo">
          <svg viewBox="0 0 128 128" role="img" aria-hidden="true">
            <defs>
              <linearGradient id="spiderGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#76f7ff" />
                <stop offset="100%" stop-color="#8b5cf6" />
              </linearGradient>
            </defs>
            <circle cx="64" cy="64" r="52" fill="rgba(11, 17, 32, 0.55)" stroke="url(#spiderGlow)" stroke-width="2" />
            <ellipse cx="64" cy="54" rx="18" ry="22" fill="url(#spiderGlow)" opacity="0.92" />
            <circle cx="64" cy="80" r="15" fill="url(#spiderGlow)" opacity="0.86" />
            <circle cx="58" cy="49" r="2.5" fill="#08111f" />
            <circle cx="70" cy="49" r="2.5" fill="#08111f" />
            <path d="M45 43 L20 24 M43 55 L12 55 M45 67 L20 86 M83 43 L108 24 M85 55 L116 55 M83 67 L108 86 M57 97 L47 111 M71 97 L81 111" stroke="url(#spiderGlow)" stroke-width="4" stroke-linecap="round" />
          </svg>
          <span>Dark Holo</span>
        </div>
      </div>

      <div class="map-stage">
        <svg class="world-map" viewBox="0 0 ${MAP_WIDTH} ${MAP_HEIGHT}" aria-labelledby="mapTitle mapDesc" role="img">
          <title id="mapTitle">Szenario-Weltkarte</title>
          <desc id="mapDesc">Zeigt aktuelle Flugplan-Tracks und Metadaten des generierten Szenarios.</desc>
          <defs>
            <linearGradient id="trackGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#7dd3fc" />
              <stop offset="100%" stop-color="#8b5cf6" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="${MAP_WIDTH}" height="${MAP_HEIGHT}" rx="24" class="map-ocean"></rect>
          <g class="map-grid">${buildGrid()}</g>
          <g class="map-continents">${CONTINENTS.map((path) => `<path d="${path}" />`).join('')}</g>
          <g data-map-tracks></g>
        </svg>
        <div class="map-empty-state" data-empty-state>
          <strong>Noch kein Szenario visualisiert</strong>
          <span>Requirements im Chat festlegen und anschließend die Suche starten.</span>
        </div>
      </div>

      <div class="map-meta">
        <div>
          <p class="eyebrow">Search status</p>
          <strong data-status-text>${escapeHtml(state.status)}</strong>
        </div>
        <div class="legend">
          <span><i class="dot track"></i> Track</span>
          <span><i class="dot waypoint"></i> Waypoints</span>
          <span><i class="dot active"></i> Auswahl</span>
        </div>
      </div>

      <div class="scenario-meta" data-scenario-meta></div>
    </section>

    <section class="workspace-grid">
      <section class="panel panel-stack chat-panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Analyzing agent</p>
            <h2>Chat Window</h2>
          </div>
          <span class="panel-state" data-chat-state>Bereit</span>
        </div>

        <div class="chat-log" data-chat-log></div>

        <form class="chat-form" data-chat-form>
          <label class="sr-only" for="chat-input">Nachricht an den Analyzing Agent</label>
          <textarea id="chat-input" name="input_message" rows="4" maxlength="1500" placeholder="Beschreibe Route, Zeitraum, Flughäfen, Fluggerät oder weitere Anforderungen..."></textarea>
          <div class="chat-actions">
            <p class="hint">Nachricht wird als <code>input_message</code> an den Workflow übergeben.</p>
            <button class="primary-button" type="submit">Nachricht senden</button>
          </div>
        </form>
      </section>

      <div class="side-stack">
        <section class="panel panel-stack requirements-panel">
          <div class="panel-header">
            <div>
              <p class="eyebrow">Live scenario filters</p>
              <h2>Requirements Window</h2>
            </div>
            <span class="panel-state" data-requirements-count>0</span>
          </div>
          <ul class="requirements-list" data-requirements-list></ul>
        </section>

        <section class="panel panel-stack workflow-panel">
          <div class="panel-header">
            <div>
              <p class="eyebrow">Curator workflow</p>
              <h2>Aktionen</h2>
            </div>
          </div>

          <div class="workflow-actions">
            <button class="primary-button" type="button" data-start-search>Start Search</button>
            <label class="export-field" for="export-path">
              <span>Export-Pfad / Dateiname</span>
              <input id="export-path" type="text" value="${escapeAttribute(state.exportPath)}" placeholder="ispider-szenario.scenario" />
            </label>
            <button class="secondary-button" type="button" data-export-scenario>Export Scenario</button>
            <button class="ghost-button" type="button" data-reset-session>Reset Session</button>
          </div>
        </section>
      </div>
    </section>
  </main>
`

const refs = {
  chatLog: app.querySelector('[data-chat-log]'),
  chatForm: app.querySelector('[data-chat-form]'),
  chatInput: app.querySelector('#chat-input'),
  chatState: app.querySelector('[data-chat-state]'),
  requirementsList: app.querySelector('[data-requirements-list]'),
  requirementsCount: app.querySelector('[data-requirements-count]'),
  startSearch: app.querySelector('[data-start-search]'),
  exportScenario: app.querySelector('[data-export-scenario]'),
  resetSession: app.querySelector('[data-reset-session]'),
  exportPath: app.querySelector('#export-path'),
  tracks: app.querySelector('[data-map-tracks]'),
  emptyState: app.querySelector('[data-empty-state]'),
  scenarioMeta: app.querySelector('[data-scenario-meta]'),
  statusText: app.querySelector('[data-status-text]'),
}

refs.chatForm.addEventListener('submit', handleMessageSubmit)
refs.startSearch.addEventListener('click', handleStartSearch)
refs.exportScenario.addEventListener('click', handleExportScenario)
refs.resetSession.addEventListener('click', handleResetSession)
refs.exportPath.addEventListener('input', (event) => {
  state.exportPath = event.target.value.trim() || 'ispider-szenario.scenario'
})

render()
registerBridge()
if (typeof adapter.attach === 'function') {
  adapter.attach(window.ISPIDER_APP)
}
window.dispatchEvent(new CustomEvent('ispider:ready'))

async function handleMessageSubmit(event) {
  event.preventDefault()
  const inputMessage = refs.chatInput.value.trim()
  if (!inputMessage || state.isAnalyzing) {
    return
  }

  appendMessage('user', inputMessage)
  refs.chatInput.value = ''
  state.isAnalyzing = true
  state.status = 'Analyzing Agent verarbeitet die Anfrage'
  renderStatus()

  try {
    const result = await adapter.handleInputMessage(inputMessage, getStateSnapshot())
    if (result?.message) {
      appendMessage('assistant', result.message)
    }
    if (result?.requirements) {
      setRequirements(result.requirements)
    }
    if (result?.scenario) {
      mergeScenario(result.scenario, { append: true })
    }
    state.status = result?.status ?? 'Requirements aktualisiert'
  } catch (error) {
    appendMessage('assistant', `Die Analyse ist fehlgeschlagen: ${error.message}`)
    state.status = 'Fehler bei der Analyse'
  } finally {
    state.isAnalyzing = false
    render()
  }
}

async function handleStartSearch() {
  if (!state.requirements.length || state.isSearching) {
    return
  }

  state.isSearching = true
  state.status = 'Curator Agent sucht passende Flugpläne'
  render()

  try {
    const result = await adapter.runCuratorSearch(state.requirements, getStateSnapshot())
    if (result?.scenario) {
      mergeScenario(result.scenario, { append: true })
    }
    if (result?.message) {
      appendMessage('assistant', result.message)
    }
    state.status = result?.status ?? 'Suche abgeschlossen'
  } catch (error) {
    appendMessage('assistant', `Die Suche ist fehlgeschlagen: ${error.message}`)
    state.status = 'Fehler bei der Suche'
  } finally {
    state.isSearching = false
    render()
  }
}

async function handleExportScenario() {
  if (!state.scenario.flights.length) {
    return
  }

  const path = ensureScenarioExtension(state.exportPath)
  state.exportPath = path
  refs.exportPath.value = path
  state.status = 'Szenario wird exportiert'
  renderStatus()

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    requirements: [...state.requirements],
    scenario: getStateSnapshot().scenario,
    requestedPath: path,
  }

  try {
    if (typeof adapter.exportScenario === 'function') {
      await adapter.exportScenario({ path, payload: exportPayload, state: getStateSnapshot() })
    }
    downloadScenario(path, exportPayload)
    state.status = `Szenario exportiert: ${path}`
  } catch (error) {
    appendMessage('assistant', `Der Export ist fehlgeschlagen: ${error.message}`)
    state.status = 'Fehler beim Export'
  } finally {
    renderStatus()
  }
}

async function handleResetSession() {
  if (typeof adapter.resetSession === 'function') {
    await adapter.resetSession(getStateSnapshot())
  }
  state.messages = [
    {
      role: 'assistant',
      content:
        'Sitzung zurückgesetzt. Beschreibe ein neues Flugplan-Szenario, um wieder Requirements aufzubauen.',
      timestamp: timestamp(),
    },
  ]
  state.requirements = []
  state.scenario = { flights: [] }
  state.selectedFlightId = null
  state.status = 'Sitzung bereit'
  state.isAnalyzing = false
  state.isSearching = false
  refs.chatInput.value = ''
  render()
}

function render() {
  renderMessages()
  renderRequirements()
  renderMap()
  renderStatus()
  refs.chatState.textContent = state.isAnalyzing ? 'Analysiert…' : 'Bereit'
  refs.startSearch.disabled = !state.requirements.length || state.isSearching || state.isAnalyzing
  refs.startSearch.textContent = state.isSearching ? 'Searching…' : 'Start Search'
  refs.exportScenario.disabled = !state.scenario.flights.length
}

function renderMessages() {
  refs.chatLog.innerHTML = state.messages
    .map(
      (message) => `
        <article class="message message-${message.role}">
          <header>
            <strong>${message.role === 'assistant' ? 'Analyzing Agent' : 'User'}</strong>
            <span>${escapeHtml(message.timestamp)}</span>
          </header>
          <p>${escapeHtml(message.content)}</p>
        </article>
      `,
    )
    .join('')
  refs.chatLog.scrollTop = refs.chatLog.scrollHeight
}

function renderRequirements() {
  refs.requirementsCount.textContent = String(state.requirements.length)
  refs.requirementsList.innerHTML = state.requirements.length
    ? state.requirements
        .map(
          (requirement, index) => `
            <li>
              <span class="requirement-index">${index + 1}</span>
              <span>${escapeHtml(requirement)}</span>
            </li>
          `,
        )
        .join('')
    : '<li class="requirements-empty">Noch keine Requirements definiert.</li>'
}

function renderMap() {
  const flights = state.scenario.flights
  refs.emptyState.hidden = flights.length > 0
  refs.tracks.innerHTML = flights
    .map((flight, index) => {
      const selected = flight.id === state.selectedFlightId || (!state.selectedFlightId && index === flights.length - 1)
      const polyline = flight.track
        .map((point) => projectPoint(point.lat, point.lon))
        .map((point) => `${point.x},${point.y}`)
        .join(' ')
      const waypoints = flight.track
        .map((point) => {
          const projected = projectPoint(point.lat, point.lon)
          return `<circle class="track-waypoint" cx="${projected.x}" cy="${projected.y}" r="4"></circle>`
        })
        .join('')
      return `
        <g class="track-group ${selected ? 'selected' : ''}" data-flight-id="${escapeAttribute(flight.id)}">
          <polyline class="track-line" points="${polyline}"></polyline>
          ${waypoints}
          <text x="${projectPoint(flight.track[flight.track.length - 1].lat, flight.track[flight.track.length - 1].lon).x + 10}" y="${projectPoint(flight.track[flight.track.length - 1].lat, flight.track[flight.track.length - 1].lon).y - 10}" class="track-label">${escapeHtml(flight.label)}</text>
        </g>
      `
    })
    .join('')

  refs.tracks.querySelectorAll('.track-group').forEach((trackElement) => {
    trackElement.addEventListener('click', () => {
      state.selectedFlightId = trackElement.dataset.flightId
      renderMap()
    })
  })

  refs.scenarioMeta.innerHTML = flights.length
    ? flights
        .map((flight, index) => {
          const isSelected = flight.id === state.selectedFlightId || (!state.selectedFlightId && index === flights.length - 1)
          return `
            <button class="flight-card ${isSelected ? 'selected' : ''}" type="button" data-flight-card="${escapeAttribute(flight.id)}">
              <strong>${escapeHtml(flight.label)}</strong>
              <span>${flight.track.length} Track-Punkte</span>
              <small>${escapeHtml(formatMeta(flight.meta))}</small>
            </button>
          `
        })
        .join('')
    : '<div class="scenario-empty">Suchergebnisse werden hier als Tracks und Metadaten dargestellt.</div>'

  refs.scenarioMeta.querySelectorAll('[data-flight-card]').forEach((card) => {
    card.addEventListener('click', () => {
      state.selectedFlightId = card.dataset.flightCard
      renderMap()
    })
  })
}

function renderStatus() {
  refs.statusText.textContent = state.status
}

function appendMessage(role, content) {
  state.messages.push({ role, content, timestamp: timestamp() })
}

function setRequirements(requirements) {
  state.requirements = normalizeRequirements(requirements)
}

function mergeScenario(payload, { append = true } = {}) {
  const normalizedFlights = normalizeScenarioPayload(payload)
  state.scenario = {
    flights: append ? [...state.scenario.flights, ...normalizedFlights] : normalizedFlights,
  }
  if (normalizedFlights.length) {
    state.selectedFlightId = normalizedFlights[normalizedFlights.length - 1].id
  }
}

function getStateSnapshot() {
  return JSON.parse(
    JSON.stringify({
      messages: state.messages,
      requirements: state.requirements,
      scenario: state.scenario,
      exportPath: state.exportPath,
      status: state.status,
    }),
  )
}

function createAdapter() {
  const externalAdapter = window.ISPIDER_CONFIG?.adapter
  if (externalAdapter) {
    return {
      handleInputMessage: externalAdapter.handleInputMessage?.bind(externalAdapter) ?? (async () => ({})),
      runCuratorSearch: externalAdapter.runCuratorSearch?.bind(externalAdapter) ?? (async () => ({})),
      exportScenario: externalAdapter.exportScenario?.bind(externalAdapter),
      resetSession: externalAdapter.resetSession?.bind(externalAdapter),
      attach: externalAdapter.attach?.bind(externalAdapter),
    }
  }
  return createMockAdapter()
}

function createMockAdapter() {
  return {
    async handleInputMessage(inputMessage, snapshot) {
      await pause(280)
      const requirements = deriveRequirements(inputMessage, snapshot.requirements)
      if (!requirements.length) {
        return {
          message:
            'Ich brauche noch mehr Details. Bitte nenne z. B. Route, Region, Zeitraum, Fluggerät oder besondere Constraints.',
          requirements: snapshot.requirements,
          status: 'Rückfrage gesendet',
        }
      }
      return {
        message: buildAnalyzingReply(requirements),
        requirements,
        status: 'Requirements bereit für die Suche',
      }
    },
    async runCuratorSearch(requirements, snapshot) {
      await pause(360)
      const scenario = {
        flights: [createMockFlight(requirements, snapshot.scenario.flights.length + 1)],
      }
      return {
        message:
          'Der Curator Agent hat ein passendes Flugplan-Ergebnis erzeugt und auf der Karte visualisiert. Du kannst die Requirements nun weiter verfeinern.',
        scenario,
        status: 'Suchergebnis visualisiert',
      }
    },
  }
}

function registerBridge() {
  window.ISPIDER_APP = {
    receiveAgentMessage(content) {
      appendMessage('assistant', content)
      render()
    },
    updateRequirements(requirements) {
      setRequirements(requirements)
      render()
    },
    updateScenario(payload, options = {}) {
      mergeScenario(payload, options)
      render()
    },
    replaceScenario(payload) {
      mergeScenario(payload, { append: false })
      render()
    },
    resetSession() {
      handleResetSession()
    },
    getState() {
      return getStateSnapshot()
    },
  }
}

function deriveRequirements(inputMessage, existingRequirements) {
  const nextRequirements = [...existingRequirements]
  const content = inputMessage.replace(/\s+/g, ' ').trim()
  const routeMatch = content.match(/(?:von|from)\s+([\p{L}\d-]+)\s+(?:nach|to)\s+([\p{L}\d-]+)/iu)
  if (routeMatch) {
    nextRequirements.push(`Route: ${routeMatch[1].toUpperCase()} → ${routeMatch[2].toUpperCase()}`)
  }

  const airportMatches = [...content.matchAll(/\b([A-Z]{3})\b/g)].map((match) => match[1])
  if (airportMatches.length >= 2) {
    nextRequirements.push(`Bevorzugte Flughäfen: ${airportMatches.join(', ')}`)
  }

  const aircraftMatch = content.match(/\b(A\d{3}|B\d{3}|CRJ\d{3}|E\d{3})\b/i)
  if (aircraftMatch) {
    nextRequirements.push(`Fluggerät: ${aircraftMatch[1].toUpperCase()}`)
  }

  const timeMatch = content.match(/\b(\d{1,2}:\d{2})\s*(?:-|bis|to)\s*(\d{1,2}:\d{2})\b/i)
  if (timeMatch) {
    nextRequirements.push(`Zeitfenster: ${timeMatch[1]}–${timeMatch[2]}`)
  }

  const dateMatch = content.match(/\b(\d{4}-\d{2}-\d{2}|\d{2}\.\d{2}\.\d{4})\b/)
  if (dateMatch) {
    nextRequirements.push(`Datum: ${dateMatch[1]}`)
  }

  const keywordMap = [
    ['fracht', 'Mission: Frachtverkehr'],
    ['cargo', 'Mission: Cargo'],
    ['passagier', 'Mission: Passagierverkehr'],
    ['night', 'Bedingung: Nachtbetrieb'],
    ['nacht', 'Bedingung: Nachtbetrieb'],
    ['notfall', 'Priorität: Notfall-Szenario'],
    ['weather', 'Bedingung: Wetterrelevanz'],
    ['wetter', 'Bedingung: Wetterrelevanz'],
    ['interkontinental', 'Reichweite: Interkontinental'],
  ]

  keywordMap.forEach(([needle, requirement]) => {
    if (content.toLowerCase().includes(needle)) {
      nextRequirements.push(requirement)
    }
  })

  if (!nextRequirements.length && content.length > 14) {
    nextRequirements.push(`Nutzerwunsch: ${content}`)
  }

  return normalizeRequirements(nextRequirements)
}

function buildAnalyzingReply(requirements) {
  const focus = requirements.slice(-2).join(' / ')
  return `Ich habe die Requirements aktualisiert. Aktueller Fokus: ${focus}. Falls nötig, kannst du die Suche jetzt starten oder weitere Constraints ergänzen.`
}

function createMockFlight(requirements, ordinal) {
  const airports = findRouteAirports(requirements)
  const [origin, destination] = airports
  const track = buildTrack(origin, destination)
  const routeName = `${origin.label} → ${destination.label}`
  return {
    id: `flight-${Date.now()}-${ordinal}`,
    label: `Flightplan ${ordinal}`,
    track,
    meta: {
      route: routeName,
      requirements: requirements.join(' · '),
      source: 'Mock Curator Result',
    },
  }
}

function findRouteAirports(requirements) {
  const requirementText = requirements.join(' ').toUpperCase()
  const matches = Object.entries(AIRPORTS).filter(([code]) => requirementText.includes(code))
  if (matches.length >= 2) {
    return [matches[0][1], matches[1][1]]
  }
  if (requirementText.includes('INTERKONTINENTAL')) {
    return [AIRPORTS.FRA, AIRPORTS.SIN]
  }
  if (requirementText.includes('CARGO') || requirementText.includes('FRACHT')) {
    return [AIRPORTS.DXB, AIRPORTS.SIN]
  }
  return [AIRPORTS.FRA, AIRPORTS.HND]
}

function buildTrack(origin, destination, points = 28) {
  return Array.from({ length: points }, (_, index) => {
    const ratio = index / (points - 1)
    const arcHeight = Math.sin(Math.PI * ratio) * 12
    return {
      lat: origin.lat + (destination.lat - origin.lat) * ratio + arcHeight,
      lon: origin.lon + (destination.lon - origin.lon) * ratio,
    }
  })
}

function normalizeScenarioPayload(payload) {
  const flights = Array.isArray(payload) ? payload : payload?.flights ?? payload?.scenario?.flights ?? []
  return flights
    .map((flight, index) => normalizeFlight(flight, index))
    .filter((flight) => flight.track.length > 1)
}

function normalizeFlight(flight, index) {
  const track = normalizeTrack(flight.track ?? flight.points ?? flight.dataframe ?? flight.data ?? flight.rows ?? flight)
  const meta =
    flight.meta ??
    Object.fromEntries(
      Object.entries(flight)
        .filter(([key]) => !['track', 'points', 'dataframe', 'data', 'rows', 'meta'].includes(key))
        .map(([key, value]) => [key, typeof value === 'object' ? JSON.stringify(value) : String(value)]),
    )
  return {
    id: flight.id ?? `normalized-flight-${Date.now()}-${index}`,
    label: flight.label ?? flight.name ?? flight.callsign ?? `Track ${index + 1}`,
    track,
    meta,
  }
}

function normalizeTrack(source) {
  if (Array.isArray(source)) {
    return source.map(normalizePoint).filter(Boolean)
  }

  if (source && typeof source === 'object') {
    if (Array.isArray(source.rows)) {
      return source.rows.map(normalizePoint).filter(Boolean)
    }

    const latitudes = source.lat ?? source.latitude ?? source.latitude_deg ?? source.Latitude
    const longitudes = source.lon ?? source.lng ?? source.long ?? source.longitude ?? source.longitude_deg ?? source.Longitude

    if (Array.isArray(latitudes) && Array.isArray(longitudes)) {
      return latitudes
        .map((lat, index) =>
          normalizePoint({
            lat,
            lon: longitudes[index],
            meta: extractColumnMeta(source, index),
          }),
        )
        .filter(Boolean)
    }
  }

  return []
}

function normalizePoint(point) {
  const lat = Number(point.lat ?? point.latitude ?? point.Latitude)
  const lon = Number(point.lon ?? point.lng ?? point.long ?? point.longitude ?? point.Longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null
  }
  return { lat, lon, meta: point.meta ?? {} }
}

function extractColumnMeta(source, index) {
  return Object.fromEntries(
    Object.entries(source)
      .filter(([key, value]) => Array.isArray(value) && !['lat', 'latitude', 'latitude_deg', 'Latitude', 'lon', 'lng', 'long', 'longitude', 'longitude_deg', 'Longitude'].includes(key))
      .map(([key, value]) => [key, value[index]]),
  )
}

function normalizeRequirements(requirements) {
  return [...new Set(requirements.map((item) => item.trim()).filter(Boolean))]
}

function projectPoint(lat, lon) {
  return {
    x: ((lon + 180) / 360) * MAP_WIDTH,
    y: ((90 - lat) / 180) * MAP_HEIGHT,
  }
}

function buildGrid() {
  const horizontalLines = [-60, -30, 0, 30, 60]
    .map((lat) => {
      const y = projectPoint(lat, 0).y
      return `<line x1="0" y1="${y}" x2="${MAP_WIDTH}" y2="${y}" />`
    })
    .join('')
  const verticalLines = [-120, -60, 0, 60, 120]
    .map((lon) => {
      const x = projectPoint(0, lon).x
      return `<line x1="${x}" y1="0" x2="${x}" y2="${MAP_HEIGHT}" />`
    })
    .join('')
  return horizontalLines + verticalLines
}

function formatMeta(meta) {
  const entries = Object.entries(meta ?? {})
  if (!entries.length) {
    return 'Keine Metadaten'
  }
  return entries
    .slice(0, 2)
    .map(([key, value]) => `${key}: ${value}`)
    .join(' · ')
}

function ensureScenarioExtension(path) {
  return path.endsWith('.scenario') ? path : `${path}.scenario`
}

function downloadScenario(path, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = path.split('/').pop() || 'ispider-szenario.scenario'
  anchor.click()
  URL.revokeObjectURL(url)
}

function pause(duration) {
  return new Promise((resolve) => window.setTimeout(resolve, duration))
}

function timestamp() {
  return new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function escapeAttribute(value) {
  return escapeHtml(value)
}
