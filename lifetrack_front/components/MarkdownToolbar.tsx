'use client'

import React from 'react'
import Button from './ui/Button'
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Link,
  Image,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Code2,
} from 'lucide-react'

type MarkdownToolbarProps = {
  onInsert: (before: string, after?: string, placeholder?: string) => void
}

export default function MarkdownToolbar({ onInsert }: MarkdownToolbarProps) {
  const tools = [
    {
      icon: Bold,
      label: 'Bold',
      action: () => onInsert('**', '**', 'bold text'),
    },
    {
      icon: Italic,
      label: 'Italic',
      action: () => onInsert('*', '*', 'italic text'),
    },
    {
      icon: Strikethrough,
      label: 'Strikethrough',
      action: () => onInsert('~~', '~~', 'strikethrough'),
    },
    {
      icon: Code,
      label: 'Inline Code',
      action: () => onInsert('`', '`', 'code'),
    },
    {
      icon: Code2,
      label: 'Code Block',
      action: () => onInsert('```javascript\n', '\n```', 'your code here'),
    },
    {
      icon: Heading1,
      label: 'Heading 1',
      action: () => onInsert('# ', '', 'Heading 1'),
    },
    {
      icon: Heading2,
      label: 'Heading 2',
      action: () => onInsert('## ', '', 'Heading 2'),
    },
    {
      icon: Heading3,
      label: 'Heading 3',
      action: () => onInsert('### ', '', 'Heading 3'),
    },
    {
      icon: List,
      label: 'Bullet List',
      action: () => onInsert('- ', '', 'List item'),
    },
    {
      icon: ListOrdered,
      label: 'Numbered List',
      action: () => onInsert('1. ', '', 'List item'),
    },
    {
      icon: Quote,
      label: 'Quote',
      action: () => onInsert('> ', '', 'Quote text'),
    },
    {
      icon: Link,
      label: 'Link',
      action: () => onInsert('[', '](https://example.com)', 'link text'),
    },
    {
      icon: Image,
      label: 'Image',
      action: () => onInsert('![', '](image-url)', 'alt text'),
    },
  ]

  return (
    <div className="flex flex-wrap gap-1 p-2 bg-[hsl(var(--muted)/0.3)] rounded-t-lg border border-b-0 border-[hsl(var(--border)/0.3)]">
      {tools.map((tool, idx) => (
        <button
          key={idx}
          type="button"
          onClick={tool.action}
          className="p-2 hover:bg-[hsl(var(--background)/0.5)] rounded transition-colors text-[hsl(var(--foreground))]"
          title={tool.label}
        >
          <tool.icon size={15} />
        </button>
      ))}
      
      <div className="ml-auto flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))] px-2">
        <span>Markdown</span>
      </div>
    </div>
  )
}
