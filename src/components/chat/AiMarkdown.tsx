import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/** Remove stray trailing timestamps sometimes appended to model output */
function sanitizeAiText(raw: string): string {
  return raw
    .replace(/\n?\d{1,2}\/\d{1,2}\/\d{4},\s*\d{1,2}:\d{2}:\d{2}\s*(?:AM|PM)?\s*$/i, '')
    .trimEnd()
}

export function AiMarkdown({ content }: { content: string }) {
  const text = sanitizeAiText(content)

  return (
    <div className="text-[15px] leading-relaxed text-ink-900">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          h1: ({ children }) => (
            <h3 className="mb-2 mt-4 text-base font-semibold first:mt-0">{children}</h3>
          ),
          h2: ({ children }) => (
            <h4 className="mb-2 mt-3 text-sm font-semibold first:mt-0">{children}</h4>
          ),
          h3: ({ children }) => (
            <h4 className="mb-2 mt-3 text-sm font-semibold first:mt-0">{children}</h4>
          ),
          ul: ({ children }) => (
            <ul className="mb-3 list-disc space-y-1.5 pl-5 last:mb-0 marker:text-brand-600">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 list-decimal space-y-1.5 pl-5 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-ink-950">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ href, children }) => (
            <a
              href={href}
              className="font-medium text-brand-700 underline decoration-brand-300 underline-offset-2 hover:text-brand-800"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          code: ({ className, children }) => {
            const isBlock = Boolean(className?.includes('language-'))
            if (isBlock) {
              return <code className={className}>{children}</code>
            }
            return (
              <code className="rounded bg-mist-200/90 px-1.5 py-0.5 font-mono text-[13px] text-ink-900">
                {children}
              </code>
            )
          },
          pre: ({ children }) => (
            <pre className="my-3 overflow-x-auto rounded-xl bg-ink-950 p-4 text-xs leading-relaxed text-mist-100">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-4 border-brand-300/80 pl-4 text-ink-800/95">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-mist-200" />,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}
