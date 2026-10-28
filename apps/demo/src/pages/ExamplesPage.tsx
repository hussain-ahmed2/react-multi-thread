import { Link } from 'react-router-dom'
import { CodeBlock } from '../components/CodeBlock'
import { ArrowIcon, ChevronRightIcon } from '../components/Icons'

const examples = [
  {
    id: 'canvas-swarm',
    tag: 'Canvas + worker pool',
    title: 'Run a canvas game loop off the main thread',
    body: 'A boid swarm performs millions of neighbor checks per frame. A worker pool splits the boids into slices, computes the next positions in parallel, and returns transferred buffers; the main thread only merges and paints them.',
    docs: { label: 'Worker pool reference', to: '/docs/api#pool' },
    code: `const swarmChunk = createWorker(({ buffer, count, start, end }) => {
  const boids = new Float32Array(buffer)
  const output = new Float32Array((end - start) * 4)
  let checks = 0

  for (let i = start; i < end; i += 1) {
    const offset = i * 4

    for (let j = 0; j < count; j += 1) {
      if (i === j) continue
      checks += 1

      // alignment, cohesion, separation, edges, pointer repel...
    }

    // write nextX / nextY / nextVx / nextVy into output...
  }

  return { buffer: output.buffer, checks }
})

let boids = new Float32Array(count * 4)
const pool = useWorkerPool(swarmChunk, { size: 4 })
const chunks = Array.from({ length: 4 }, (_, index) => ({
  start: Math.floor((count * index) / 4),
  end: Math.floor((count * (index + 1)) / 4),
}))

async function frame() {
  const results = await pool.map(chunks.map(({ start, end }) => ({
    buffer: boids.buffer,
    count,
    width,
    height,
    start,
    end,
  })))

  const next = new Float32Array(count * 4)
  results.forEach((result, index) => {
    next.set(new Float32Array(result.buffer), chunks[index].start * 4)
  })

  boids = next
  draw(boids)
  requestAnimationFrame(() => void frame())
}

requestAnimationFrame(() => void frame())`,
  },
  {
    id: 'image-resize',
    tag: 'Transferables',
    title: 'Resize an image without blocking paint',
    body: 'Decode on the main thread, then hand the ImageBitmap to a worker. Ownership moves instead of copying pixels, and the preview stays responsive.',
    docs: { label: 'Transferables guide', to: '/docs/concepts#transferables' },
    code: `const resize = createWorker(
  async ({ bitmap, width, height }, ctx) => {
    const canvas = new OffscreenCanvas(width, height)
    const context = canvas.getContext('2d')
    if (context === null) throw new Error('2D canvas unavailable')

    context.drawImage(bitmap, 0, 0, width, height)
    ctx.progress(0.8)

    return canvas.convertToBlob({
      type: 'image/webp',
      quality: 0.85,
    })
  },
)

const bitmap = await createImageBitmap(file)
const blob = await worker.run(
  { bitmap, width: 1280, height: 720 },
  { transfer: [bitmap] },
)`,
  },
  {
    id: 'csv',
    tag: 'Progress',
    title: 'Parse and aggregate a large CSV',
    body: 'Read the file on the main thread, pass the text once, and stream progress back while the worker builds the aggregate.',
    docs: { label: 'Progress and cancellation', to: '/docs/concepts#cancellation' },
    code: `type Row = { region: string; revenue: number }

const aggregate = createWorker((text: string, ctx) => {
  const rows = text.split('\\n')
  const totals = new Map<string, number>()

  rows.forEach((line, index) => {
    const [region, revenue] = line.split(',')
    if (region === undefined || revenue === undefined) return

    totals.set(region, (totals.get(region) ?? 0) + Number(revenue))

    if (index % 25_000 === 0) {
      ctx.progress(index / rows.length)
      if (ctx.cancelled) return null
    }
  })

  return [...totals.entries()]
})

const result = await worker.run(csvText)`,
  },
  {
    id: 'search-index',
    tag: 'Worker pool',
    title: 'Build a search index across every core',
    body: 'Split documents into deterministic chunks, map them through a pool, then merge the partial indexes on the main thread.',
    docs: { label: 'Pool reference', to: '/docs/api#pool' },
    code: `const indexChunk = createWorker(
  (documents: readonly string[], ctx) => {
    const postings = new Map<string, number[]>()

    documents.forEach((document, index) => {
      for (const token of document.toLowerCase().split(/\\W+/)) {
        if (token.length < 2) continue
        const bucket = postings.get(token) ?? []
        bucket.push(index)
        postings.set(token, bucket)
      }
    })

    return [...postings.entries()]
  },
)

const pool = useWorkerPool(indexChunk, { size: 4 })
const chunks = chunk(documents, 500)
const partials = await pool.map(chunks)`,
  },
  {
    id: 'hash',
    tag: 'Proxy API',
    title: 'Hash files with a method-style worker',
    body: 'Expose several related operations as one object, then call them as typed async functions. Each call is serialized through the same worker.',
    docs: { label: 'Proxy reference', to: '/docs/api#proxy' },
    code: `const crypto = createWorker({
  async sha256(buffer: ArrayBuffer) {
    const digest = await crypto.subtle.digest('SHA-256', buffer)
    return [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')
  },

  size(buffer: ArrayBuffer) {
    return buffer.byteLength
  },
})

const api = useWorkerProxy(crypto)

const [hash, size] = await Promise.all([
  api.sha256(buffer),
  api.size(buffer),
])`,
  },
] as const

export function ExamplesPage() {
  return (
    <div className="page">
      <section className="page-masthead">
        <div className="hero-wash" aria-hidden="true" />
        <div className="grid-wash" aria-hidden="true" />
        <div className="shell page-masthead__inner">
          <span className="eyebrow">Examples</span>
          <h1>Patterns for the work that hurts.</h1>
          <p>
            Five recipes that cover the common shapes: a canvas game loop, ownership transfer,
            progress, fan-out, and method-style APIs. Every snippet is runnable against the
            published package.
          </p>
          <div className="page-masthead__actions">
            <Link className="button button--primary" to="/playground">
              See them live
              <ArrowIcon width={16} height={16} />
            </Link>
            <Link className="button button--ghost" to="/docs/concepts">
              Read the model
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <div className="examples">
            {examples.map((example, index) => (
              <article className="example" id={example.id} key={example.id}>
                <div className="example__header">
                  <span className="example__number">{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <span className="example__tag">{example.tag}</span>
                    <h2>{example.title}</h2>
                    <p>{example.body}</p>
                    <Link className="text-link" to={example.docs.to}>
                      {example.docs.label}
                      <ChevronRightIcon width={14} height={14} />
                    </Link>
                  </div>
                </div>
                <CodeBlock code={example.code} title={`${example.id}.ts`} />
              </article>
            ))}
          </div>

          <div className="callout callout--wide">
            <span className="callout__icon">
              <ArrowIcon width={16} height={16} />
            </span>
            <div>
              <strong>Have a workload that does not fit?</strong>
              <p>
                If it is synchronous, self-contained, and CPU-bound, it belongs in a worker. The{' '}
                <Link to="/docs/concepts">core concepts guide</Link> covers the boundary rules.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
