import { useEffect, useState, type ChangeEvent } from 'react'

const DEFAULT_API_URL = 'http://localhost:8000'
const SAMPLE_IMAGE = '/fixtures/sample-wall.png'
const SAMPLE_ROUTE = '/fixtures/sample-route.json'
const MAX_BYTES = 10 * 1024 * 1024

type Hold = {
  id: string
  x: number
  y: number
  order: number
}

type Move = {
  step: number
  holdId: string
  limb: string
}

type RouteSolution = {
  imageWidth: number
  imageHeight: number
  holds: Hold[]
  moves: Move[]
}

function apiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL?.trim()
  const base = configured ? configured : DEFAULT_API_URL
  return base.replace(/\/$/, '')
}

function isJpegOrPng(file: File): boolean {
  return file.type === 'image/jpeg' || file.type === 'image/png'
}

function isHold(value: unknown): value is Hold {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const hold = value as Record<string, unknown>
  return (
    typeof hold.id === 'string' &&
    typeof hold.x === 'number' &&
    typeof hold.y === 'number' &&
    typeof hold.order === 'number'
  )
}

function isMove(value: unknown): value is Move {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const move = value as Record<string, unknown>
  return (
    typeof move.step === 'number' &&
    typeof move.holdId === 'string' &&
    typeof move.limb === 'string'
  )
}

function parseRoute(value: unknown): RouteSolution | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }
  const route = value as Record<string, unknown>
  if (!Array.isArray(route.holds) || !Array.isArray(route.moves)) {
    return null
  }
  if (!route.holds.every(isHold) || !route.moves.every(isMove)) {
    return null
  }
  const imageWidth = typeof route.imageWidth === 'number' ? route.imageWidth : 0
  const imageHeight = typeof route.imageHeight === 'number' ? route.imageHeight : 0
  return {
    imageWidth,
    imageHeight,
    holds: [...route.holds].sort((a, b) => a.order - b.order),
    moves: [...route.moves].sort((a, b) => a.step - b.step),
  }
}

async function loadSampleRoute(): Promise<RouteSolution> {
  const response = await fetch(SAMPLE_ROUTE)
  if (!response.ok) {
    throw new Error('Sample route is missing')
  }
  const route = parseRoute(await response.json())
  if (!route) {
    throw new Error('Sample route is invalid')
  }
  return route
}

async function readError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as unknown
    if (
      typeof payload === 'object' &&
      payload !== null &&
      'error' in payload &&
      typeof payload.error === 'string'
    ) {
      return payload.error
    }
  } catch {
    // The server did not return JSON.
  }
  return 'Only JPEG and PNG up to 10 MB are accepted.'
}

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [solution, setSolution] = useState<RouteSolution | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!previewUrl) {
      return
    }
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  function resetResult() {
    setSolution(null)
    setImageSrc(null)
    setStepIndex(0)
    setNotice(null)
  }

  function onFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0]
    if (!selected) {
      return
    }
    if (!isJpegOrPng(selected)) {
      setError('Only JPEG and PNG files are accepted.')
      event.target.value = ''
      return
    }
    if (selected.size > MAX_BYTES) {
      setError('Images must be 10 MB or smaller.')
      event.target.value = ''
      return
    }
    setError(null)
    setFile(selected)
    setPreviewUrl(URL.createObjectURL(selected))
    resetResult()
  }

  async function showSample(message: string) {
    const route = await loadSampleRoute()
    setSolution(route)
    setImageSrc(SAMPLE_IMAGE)
    setStepIndex(0)
    setNotice(message)
  }

  async function onAnalyze() {
    if (!file || !previewUrl) {
      setError('Choose a JPEG or PNG first.')
      return
    }
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const body = new FormData()
      body.append('image', file)
      const response = await fetch(`${apiBaseUrl()}/analyze`, {
        method: 'POST',
        body,
      })
      if (response.status === 400) {
        setError(await readError(response))
        return
      }
      if (!response.ok) {
        await showSample(
          'Sample route. The server has no analysis result yet, so this is the demo wall rather than your photo.',
        )
        return
      }
      const route = parseRoute(await response.json())
      if (!route) {
        await showSample(
          'Sample route. The server response was not a route, so this is the demo wall rather than your photo.',
        )
        return
      }
      setSolution(route)
      setImageSrc(previewUrl)
      setStepIndex(0)
    } catch {
      try {
        await showSample(
          'Sample route. The server could not be reached, so this is the demo wall rather than your photo.',
        )
      } catch {
        setError('The sample route could not be loaded.')
      }
    } finally {
      setBusy(false)
    }
  }

  async function onUseSample() {
    setBusy(true)
    setError(null)
    try {
      await showSample('Sample route. These holds are demo data, not detected from a photo.')
    } catch {
      setError('The sample route could not be loaded.')
    } finally {
      setBusy(false)
    }
  }

  function onStartOver() {
    setFile(null)
    setPreviewUrl(null)
    setError(null)
    resetResult()
    const input = document.getElementById('wall-photo')
    if (input instanceof HTMLInputElement) {
      input.value = ''
    }
  }

  const move = solution?.moves[stepIndex]
  const currentHoldId = move?.holdId

  return (
    <main>
      <h1>ClimbAssist</h1>
      <p className="intro">
        Upload a photo of the wall, then step through one numbered way to climb it.
      </p>

      <section className="card">
        <label className="file-label" htmlFor="wall-photo">
          Wall photo
          <input
            id="wall-photo"
            type="file"
            accept="image/jpeg,image/png"
            capture="environment"
            onChange={onFile}
          />
        </label>
        <p className="hint">JPEG or PNG, up to 10 MB. You can replace the photo before analyzing it.</p>

        {error ? <p className="error">{error}</p> : null}

        <div className="actions">
          <button type="button" onClick={onAnalyze} disabled={busy || !file}>
            {busy ? 'Working...' : 'Analyze'}
          </button>
          <button type="button" className="secondary" onClick={onUseSample} disabled={busy}>
            Use sample wall
          </button>
        </div>

        {previewUrl && !solution ? (
          <img className="preview" src={previewUrl} alt="Selected wall" />
        ) : null}

        {solution && imageSrc ? (
          <div className="result">
            {notice ? <p className="notice">{notice}</p> : null}
            <div className="stage">
              <img src={imageSrc} alt="Climbing wall with numbered holds" />
              {solution.holds.map((hold) => (
                <span
                  key={hold.id}
                  className={hold.id === currentHoldId ? 'hold current' : 'hold'}
                  style={{ left: `${hold.x * 100}%`, top: `${hold.y * 100}%` }}
                >
                  {hold.order}
                </span>
              ))}
            </div>
            {move ? (
              <>
                <p className="step">
                  Step {stepIndex + 1} of {solution.moves.length}
                </p>
                <p className="limb">{move.limb}</p>
              </>
            ) : (
              <p className="limb">No sequence was returned for this photo.</p>
            )}
            <div className="actions">
              <button
                type="button"
                onClick={() => setStepIndex((index) => index - 1)}
                disabled={!move || stepIndex === 0}
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStepIndex((index) => index + 1)}
                disabled={!move || stepIndex >= solution.moves.length - 1}
              >
                Next
              </button>
              <button type="button" className="secondary" onClick={onStartOver}>
                Start over
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  )
}

export default App
