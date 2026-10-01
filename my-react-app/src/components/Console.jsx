import { useEffect, useRef, useState } from 'react'

// Shows the session as the console version would print it. Scrolls to the
// start of the printed output once there is one, otherwise to the bottom.
export default function Console({ lines, waiting }) {
  const bodyRef = useRef(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const body = bodyRef.current
    const anchor = body.querySelector('[data-anchor]')
    body.scrollTop = anchor ? anchor.offsetTop - 12 : body.scrollHeight
  }, [lines])

  async function copy() {
    try {
      await navigator.clipboard.writeText(lines.map((line) => `${line.text}\n`).join(''))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard access can be blocked; the text is still selectable.
    }
  }

  return (
    <div className="console">
      <div className="console-bar">
        <span className="console-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="console-title">logic.cc</span>
        <button type="button" className="console-copy" onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="console-body" ref={bodyRef} tabIndex={0} aria-label="Console output">
        {lines.map((line, i) => (
          <span key={i} className={`line line-${line.kind}`} data-anchor={line.anchor || undefined}>
            {line.text}
            {'\n'}
          </span>
        ))}
        {waiting && <span className="cursor" aria-hidden="true" />}
      </pre>
    </div>
  )
}
