'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Paperclip } from 'lucide-react'

type MarkdownRendererProps = {
  content: string
  className?: string
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  // Extract attachment metadata for display
  const extractAttachments = (text: string) => {
    const attachments: Array<{ name: string; size: number; type: string }> = []
    const regex = /<!--\s*ATTACHMENT:\s*(\{[^}]+\})\s*-->/g
    let match
    
    while ((match = regex.exec(text)) !== null) {
      try {
        attachments.push(JSON.parse(match[1]))
      } catch (e) {
        console.error('Failed to parse attachment:', e)
      }
    }
    
    return attachments
  }
  
  const attachments = extractAttachments(content)
  
  // Remove attachment metadata from rendered content
  const cleanContent = content.replace(/<!--\s*ATTACHMENT:\s*(\{[^}]+\})\s*-->/g, '')
  
  return (
    <div className={className}>
      <div className="prose prose-invert max-w-none markdown-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw, rehypeSanitize]}
          components={{
            code(props) {
              const { node, className, children, ref, ...rest } = props as any
              const match = /language-(\w+)/.exec(className || '')
              const language = match ? match[1] : ''
              const isInline = !match
              
              return isInline ? (
                <code
                  className={`${className || ''} bg-[hsl(var(--muted))] px-1.5 py-0.5 rounded text-sm`}
                >
                  {children}
                </code>
              ) : (
                <SyntaxHighlighter
                  style={vscDarkPlus as any}
                  language={language}
                  PreTag="div"
                  className="rounded-lg !mt-2 !mb-4"
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              )
            },
            h1: ({ children }) => (
              <h1 className="text-3xl font-bold mb-4 mt-6 text-[hsl(var(--foreground))]">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-2xl font-bold mb-3 mt-5 text-[hsl(var(--foreground))]">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-xl font-semibold mb-2 mt-4 text-[hsl(var(--foreground))]">
                {children}
              </h3>
            ),
            p: ({ children }) => (
              <p className="mb-4 text-[hsl(var(--foreground))] leading-relaxed">
                {children}
              </p>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                className="text-[hsl(var(--primary))] hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            ),
            ul: ({ children }) => (
              <ul className="list-disc list-inside mb-4 space-y-1 text-[hsl(var(--foreground))]">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal list-inside mb-4 space-y-1 text-[hsl(var(--foreground))]">
                {children}
              </ol>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-[hsl(var(--primary))] pl-4 italic my-4 text-[hsl(var(--muted-foreground))]">
                {children}
              </blockquote>
            ),
            table: ({ children }) => (
              <div className="overflow-x-auto my-4">
                <table className="min-w-full border border-[hsl(var(--border))]">
                  {children}
                </table>
              </div>
            ),
            th: ({ children }) => (
              <th className="border border-[hsl(var(--border))] px-4 py-2 bg-[hsl(var(--muted))] font-semibold text-left">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border border-[hsl(var(--border))] px-4 py-2">
                {children}
              </td>
            ),
            hr: () => (
              <hr className="my-6 border-t border-[hsl(var(--border))]" />
            ),
            img: ({ src, alt }) => (
              <img
                src={src}
                alt={alt || ''}
                className="max-w-full h-auto rounded-lg my-4"
              />
            ),
          }}
        >
          {cleanContent}
        </ReactMarkdown>
      </div>
      
      {attachments.length > 0 && (
        <div className="mt-6 pt-4 border-t border-[hsl(var(--border))]">
          <h4 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-2">
            Attachments
          </h4>
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 px-3 py-2 bg-[hsl(var(--muted))] rounded text-sm"
              >
                <Paperclip size={14} />
                <span className="text-[hsl(var(--foreground))]">{file.name}</span>
                <span className="text-[hsl(var(--muted-foreground))] text-xs">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
