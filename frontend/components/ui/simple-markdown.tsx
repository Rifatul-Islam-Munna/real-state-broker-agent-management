import ReactMarkdown from "react-markdown"
import rehypeSanitize from "rehype-sanitize"
import remarkGfm from "remark-gfm"

export function markdownToPlainText(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/[*_>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function SimpleMarkdown({
  className = "",
  value,
}: {
  className?: string
  value: string
}) {
  const normalized = value.replace(/\r\n/g, "\n").trim()

  if (!normalized) {
    return null
  }

  return (
    <div className={className}>
      <ReactMarkdown
        components={{
          a: ({ ...props }) => <a className="font-semibold text-primary underline underline-offset-4" rel="noreferrer" target="_blank" {...props} />,
          blockquote: ({ ...props }) => <blockquote className="border-l-4 border-accent pl-4 italic text-muted-foreground" {...props} />,
          code: ({ className: codeClassName, ...props }) =>
            codeClassName ? (
              <code className="rounded-xl bg-slate-950 px-1.5 py-0.5 font-mono text-slate-100" {...props} />
            ) : (
              <code className="rounded bg-primary/8 px-1.5 py-0.5 font-mono text-[0.95em] text-foreground" {...props} />
            ),
          h1: ({ ...props }) => <h1 className="text-3xl font-black text-foreground" {...props} />,
          h2: ({ ...props }) => <h2 className="text-2xl font-black text-foreground" {...props} />,
          h3: ({ ...props }) => <h3 className="text-xl font-black text-foreground" {...props} />,
          h4: ({ ...props }) => <h4 className="text-lg font-black text-foreground" {...props} />,
          li: ({ ...props }) => <li className="leading-8 text-slate-600" {...props} />,
          ol: ({ ...props }) => <ol className="list-decimal space-y-2 pl-6" {...props} />,
          p: ({ ...props }) => <p className="leading-8 text-slate-600" {...props} />,
          pre: ({ ...props }) => <pre className="overflow-x-auto rounded-2xl bg-slate-950 px-4 py-4 text-sm text-slate-100" {...props} />,
          strong: ({ ...props }) => <strong className="font-bold text-foreground" {...props} />,
          ul: ({ ...props }) => <ul className="list-disc space-y-2 pl-6" {...props} />,
        }}
        rehypePlugins={[rehypeSanitize]}
        remarkPlugins={[remarkGfm]}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  )
}
