import { useState } from 'react'
import { CheckIcon, CopyIcon } from './Icons'

export type CodeBlockProps = {
  readonly code: string
  readonly title?: string
}

export function CodeBlock({ code, title }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return

    void navigator.clipboard
      .writeText(code)
      .then(() => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1400)
      })
      .catch(() => undefined)
  }

  return (
    <div className="code-block">
      <div className="code-block__bar">
        <span className="code-block__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="code-block__title">{title ?? 'example.ts'}</span>
        <button
          type="button"
          className="code-block__copy"
          onClick={copy}
          aria-label={copied ? 'Copied' : 'Copy code'}
        >
          {copied ? <CheckIcon width={14} height={14} /> : <CopyIcon width={14} height={14} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="code-block__code">
        <code>{code}</code>
      </pre>
    </div>
  )
}
