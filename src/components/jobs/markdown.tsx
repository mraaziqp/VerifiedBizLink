'use client';

import { useRef, useState, type ReactNode } from 'react';
import { Bold, Eye, Heading2, Italic, List, ListOrdered, PencilLine } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

/**
 * A small, deliberately limited markdown for job listings: headings, bullet
 * and numbered lists, bold, italic and links.
 *
 * Rendered to React elements, never to an HTML string, so there is no
 * dangerouslySetInnerHTML and nothing an employer types can become markup on
 * a candidate's screen. Links are http(s) only for the same reason.
 *
 * Plain text written before this existed still reads the way it did: blank
 * lines separate paragraphs and single line breaks are kept.
 */

const INLINE = /\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g;

function inline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const m of text.matchAll(INLINE)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const key = `${keyPrefix}-${n++}`;
    if (m[1] !== undefined) out.push(<strong key={key} className="font-bold">{m[1]}</strong>);
    else if (m[2] !== undefined) out.push(<em key={key}>{m[2]}</em>);
    else {
      const href = m[4] ?? m[5];
      out.push(
        <a key={key} href={href} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-blue-700 underline underline-offset-2 break-words">
          {m[3] ?? m[5]}
        </a>,
      );
    }
    last = at + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'ul' | 'ol'; items: string[] }
  | { type: 'p'; lines: string[] };

function parse(source: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ type: 'p', lines: paragraph });
    paragraph = [];
  };

  for (const raw of String(source ?? '').replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trimEnd();
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    const bullet = line.match(/^\s*[-*•]\s+(.+)$/);
    const numbered = line.match(/^\s*\d{1,2}[.)]\s+(.+)$/);

    if (!line.trim()) {
      flush();
    } else if (heading) {
      flush();
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] });
    } else if (bullet || numbered) {
      flush();
      const type = bullet ? 'ul' : 'ol';
      const item = (bullet ?? numbered)![1];
      const prev = blocks[blocks.length - 1];
      if (prev && prev.type === type) prev.items.push(item);
      else blocks.push({ type, items: [item] });
    } else {
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
}

export function Markdown({ source, className }: { source: string | null | undefined; className?: string }) {
  const blocks = parse(source ?? '');
  if (blocks.length === 0) return null;
  return (
    <div className={cn('space-y-3 text-[15px] leading-relaxed text-slate-800', className)}>
      {blocks.map((b, i) => {
        if (b.type === 'heading') {
          return (
            <h3 key={i} className={cn('font-bold text-slate-900', b.level === 1 ? 'text-lg' : 'text-base', i > 0 && 'pt-1')}>
              {inline(b.text, `h${i}`)}
            </h3>
          );
        }
        if (b.type !== 'p') {
          const Tag = b.type;
          return (
            <Tag key={i} className={cn('space-y-1.5 pl-5', b.type === 'ul' ? 'list-disc' : 'list-decimal')}>
              {b.items.map((item, x) => (
                <li key={x} className="pl-1 marker:text-slate-400">{inline(item, `l${i}-${x}`)}</li>
              ))}
            </Tag>
          );
        }
        return (
          <p key={i} className="break-words">
            {b.lines.map((line, x) => (
              <span key={x}>
                {x > 0 && <br />}
                {inline(line, `p${i}-${x}`)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

const TOOLS = [
  { id: 'bold', label: 'Bold', icon: Bold },
  { id: 'italic', label: 'Italic', icon: Italic },
  { id: 'heading', label: 'Heading', icon: Heading2 },
  { id: 'bullets', label: 'Bullet list', icon: List },
  { id: 'numbers', label: 'Numbered list', icon: ListOrdered },
] as const;
type ToolId = (typeof TOOLS)[number]['id'];

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  id?: string;
}

/**
 * A textarea with just enough formatting help that an employer never has to
 * know the syntax: the buttons write it for them, and Preview shows exactly
 * what candidates will see.
 */
export function MarkdownEditor({ value, onChange, placeholder, rows = 7, maxLength, id }: MarkdownEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);

  /** Wraps the selection, or inserts a placeholder to type over. */
  const wrap = (before: string, after: string, fallback: string) => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    const selected = value.slice(start, end) || fallback;
    onChange(value.slice(0, start) + before + selected + after + value.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  /** Prefixes every selected line — how a list or a heading is made. */
  const prefixLines = (prefix: (index: number) => string) => {
    const el = ref.current;
    if (!el) return;
    const start = value.lastIndexOf('\n', el.selectionStart - 1) + 1;
    const endAt = value.indexOf('\n', el.selectionEnd);
    const end = endAt === -1 ? value.length : endAt;
    const lines = value.slice(start, end).split('\n');
    const next = lines.map((line, i) => prefix(i) + line.replace(/^(\s*[-*•]\s+|\s*\d{1,2}[.)]\s+|#{1,3}\s+)/, '')).join('\n');
    onChange(value.slice(0, start) + next + value.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + next.length, start + next.length);
    });
  };

  const apply = (tool: ToolId) => {
    if (tool === 'bold') wrap('**', '**', 'bold text');
    else if (tool === 'italic') wrap('*', '*', 'italic text');
    else if (tool === 'heading') prefixLines(() => '## ');
    else if (tool === 'bullets') prefixLines(() => '- ');
    else prefixLines((i) => `${i + 1}. `);
  };

  return (
    <div className="mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-slate-900 focus-within:ring-2 focus-within:ring-slate-900/10">
      <div className="flex items-center gap-0.5 border-b border-slate-100 bg-slate-50 px-1.5 py-1">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            type="button"
            title={tool.label}
            aria-label={tool.label}
            disabled={preview}
            onClick={() => apply(tool.id)}
            className="rounded-md p-1.5 text-slate-600 hover:bg-white hover:text-slate-900 disabled:opacity-30"
          >
            <tool.icon className="h-4 w-4" />
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPreview((p) => !p)}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-bold text-slate-600 hover:bg-white hover:text-slate-900"
        >
          {preview ? <PencilLine className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {preview ? 'Edit' : 'Preview'}
        </button>
      </div>

      {preview ? (
        <div className="min-h-[120px] p-3">
          {value.trim()
            ? <Markdown source={value} />
            : <p className="text-sm text-slate-400">Nothing to preview yet.</p>}
        </div>
      ) : (
        <Textarea
          id={id}
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          maxLength={maxLength}
          placeholder={placeholder}
          className="rounded-none border-0 bg-white text-slate-900 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      )}
    </div>
  );
}
