'use client';

import { useRef, useState, type ReactNode } from 'react';
import {
  Bold, Eye, Heading2, Italic, List, ListOrdered, PencilLine,
  CheckCircle2, Sparkles, MapPin, Briefcase, Award, Clock, DollarSign,
  ChevronRight
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

/**
 * Enhanced Smart Markdown & Section Formatter for Job Listings.
 *
 * Intelligently recognizes:
 * 1. Markdown syntax (headings, bold, italic, links, lists)
 * 2. Key-Value metadata lines (e.g. "Location: Cape Town", "Position Type: Contract", "Industry: Tech")
 * 3. Implicit section titles (e.g. "The Opportunity", "About VerifiedBizLink", "You will be responsible for:")
 * 4. Structured responsibilities and perk blocks with luxury visual badges.
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
    if (m[1] !== undefined) out.push(<strong key={key} className="font-bold text-slate-900">{m[1]}</strong>);
    else if (m[2] !== undefined) out.push(<em key={key} className="italic text-slate-700">{m[2]}</em>);
    else {
      const href = m[4] ?? m[5];
      out.push(
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="font-bold text-amber-700 underline underline-offset-2 break-words hover:text-amber-800"
        >
          {m[3] ?? m[5]}
        </a>
      );
    }
    last = at + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

// Section headers that commonly appear in plain text job ads
const SECTION_HEADER_REGEX = /^(the opportunity|about us|about [a-z0-9\s&-]+|you will be responsible for:?|key responsibilities:?|responsibilities:?|what you will do:?|what we're looking for:?|requirements:?|qualifications:?|experience & skills:?|compensation & perks:?|what we offer:?|commission structure:?|benefits:?|how to apply:?)$/i;

const KEY_VALUE_REGEX = /^(location|position type|role type|industry|experience|compensation|salary|hours|work model|start date):\s*(.+)$/i;

type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'section_card'; title: string; lines: string[]; iconType?: string }
  | { type: 'key_value_group'; items: { key: string; value: string }[] }
  | { type: 'ul' | 'ol'; items: string[] }
  | { type: 'p'; lines: string[] };

function getSectionIcon(title: string) {
  const t = title.toLowerCase();
  if (t.includes('opportunity') || t.includes('about')) return Sparkles;
  if (t.includes('responsib') || t.includes('do')) return CheckCircle2;
  if (t.includes('require') || t.includes('look') || t.includes('qualif')) return Award;
  if (t.includes('compens') || t.includes('offer') || t.includes('benefit') || t.includes('commission')) return DollarSign;
  return ChevronRight;
}

function getKeyIcon(keyName: string) {
  const k = keyName.toLowerCase();
  if (k.includes('location')) return MapPin;
  if (k.includes('position') || k.includes('role') || k.includes('industry')) return Briefcase;
  if (k.includes('experience')) return Award;
  if (k.includes('salary') || k.includes('compens')) return DollarSign;
  return Clock;
}

export function parse(source: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let currentKeyValueGroup: { key: string; value: string }[] = [];

  const flushKv = () => {
    if (currentKeyValueGroup.length) {
      blocks.push({ type: 'key_value_group', items: [...currentKeyValueGroup] });
      currentKeyValueGroup = [];
    }
  };

  const flush = () => {
    flushKv();
    if (paragraph.length) {
      blocks.push({ type: 'p', lines: paragraph });
      paragraph = [];
    }
  };

  const lines = String(source ?? '').replace(/\r\n/g, '\n').split('\n');

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    const bullet = line.match(/^[-*•]\s+(.+)$/);
    const numbered = line.match(/^\d{1,2}[.)]\s+(.+)$/);
    const kvMatch = line.match(KEY_VALUE_REGEX);
    const isSectionHeader = !heading && !bullet && !numbered && SECTION_HEADER_REGEX.test(line);

    if (!line) {
      flush();
    } else if (kvMatch) {
      flush();
      currentKeyValueGroup.push({ key: kvMatch[1], value: kvMatch[2] });
    } else if (heading) {
      flush();
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] });
    } else if (isSectionHeader) {
      flush();
      // Lookahead: gather following lines until blank line or next section
      const sectionLines: string[] = [];
      let j = i + 1;
      while (j < lines.length && lines[j].trim() !== '') {
        const nextLine = lines[j].trim();
        if (SECTION_HEADER_REGEX.test(nextLine) || nextLine.match(/^(#{1,3})\s+/)) break;
        sectionLines.push(lines[j].trimEnd());
        j++;
      }
      blocks.push({
        type: 'section_card',
        title: line.replace(/:$/, ''),
        lines: sectionLines,
      });
      i = j - 1; // Advance loop
    } else if (bullet || numbered) {
      flush();
      const type = bullet ? 'ul' : 'ol';
      const item = (bullet ?? numbered)![1];
      const prev = blocks[blocks.length - 1];
      if (prev && prev.type === type) prev.items.push(item);
      else blocks.push({ type, items: [item] });
    } else {
      flushKv();
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
    <div className={cn('space-y-4 text-[15px] leading-relaxed text-slate-800', className)}>
      {blocks.map((b, i) => {
        if (b.type === 'key_value_group') {
          return (
            <div key={i} className="my-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {b.items.map((item, idx) => {
                const Icon = getKeyIcon(item.key);
                return (
                  <div
                    key={idx}
                    className="flex items-start gap-3 rounded-xl border border-amber-200/70 bg-gradient-to-br from-amber-50/60 to-white p-3 shadow-xs"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-400/20 text-amber-800">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                        {item.key}
                      </p>
                      <p className="text-xs font-bold text-slate-900 break-words">
                        {inline(item.value, `kv-${i}-${idx}`)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        }

        if (b.type === 'section_card') {
          const Icon = getSectionIcon(b.title);
          return (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-xs transition hover:border-amber-300/80 hover:shadow-sm sm:p-5"
            >
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-900">
                  <Icon className="h-4 w-4" />
                </div>
                <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                  {b.title}
                </h4>
              </div>

              <div className="mt-3 space-y-2 text-[14px] text-slate-700 leading-relaxed">
                {b.lines.map((line, lIdx) => {
                  const isSubBullet = line.trim().startsWith('-') || line.trim().startsWith('•') || line.trim().startsWith('*');
                  const cleanLine = isSubBullet ? line.trim().replace(/^[-•*]\s*/, '') : line;

                  if (isSubBullet) {
                    return (
                      <div key={lIdx} className="flex items-start gap-2.5 pl-1">
                        <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        <span className="flex-1">{inline(cleanLine, `sec-${i}-${lIdx}`)}</span>
                      </div>
                    );
                  }

                  return (
                    <p key={lIdx} className="break-words">
                      {inline(line, `sec-${i}-${lIdx}`)}
                    </p>
                  );
                })}
              </div>
            </div>
          );
        }

        if (b.type === 'heading') {
          return (
            <div key={i} className="flex items-center gap-2 pt-2 border-b border-slate-100 pb-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <h3 className={cn('font-black tracking-tight text-slate-900', b.level === 1 ? 'text-lg sm:text-xl' : 'text-base')}>
                {inline(b.text, `h${i}`)}
              </h3>
            </div>
          );
        }

        if (b.type !== 'p') {
          const Tag = b.type;
          return (
            <Tag key={i} className={cn('space-y-2 pl-2 sm:pl-3', b.type === 'ul' ? 'list-none' : 'list-decimal pl-6')}>
              {b.items.map((item, x) => (
                <li key={x} className="flex items-start gap-2.5 text-slate-700">
                  {b.type === 'ul' ? (
                    <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-amber-600" />
                  ) : null}
                  <span className="flex-1">{inline(item, `l${i}-${x}`)}</span>
                </li>
              ))}
            </Tag>
          );
        }

        return (
          <p key={i} className="break-words text-slate-700 leading-relaxed">
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

export function MarkdownEditor({ value, onChange, placeholder, rows = 7, maxLength, id }: MarkdownEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);

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

  const prefixLines = (prefix: (index: number) => string) => {
    const el = ref.current;
    if (!el) return;
    const start = value.lastIndexOf('\n', el.selectionStart - 1) + 1;
    const endAt = value.indexOf('\n', el.selectionEnd);
    const end = endAt === -1 ? value.length : endAt;
    const lines = value.slice(start, end).split('\n');
    const transformed = lines.map((l, i) => `${prefix(i)}${l.replace(/^(#+\s+|[-*•]\s+|\d+[.)]\s+)/, '')}`).join('\n');
    onChange(value.slice(0, start) + transformed + value.slice(end));
  };

  const insertSnippet = (snippet: string) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const prefix = value.length > 0 && !value.endsWith('\n\n') ? '\n\n' : '';
    const next = value.slice(0, start) + prefix + snippet + value.slice(end);
    onChange(next);
  };

  const apply = (tool: ToolId) => {
    if (tool === 'bold') wrap('**', '**', 'bold text');
    else if (tool === 'italic') wrap('*', '*', 'italic text');
    else if (tool === 'heading') prefixLines(() => '## ');
    else if (tool === 'bullets') prefixLines(() => '- ');
    else if (tool === 'numbers') prefixLines((i) => `${i + 1}. `);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-xs focus-within:border-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-1 border-b border-slate-100 bg-slate-50/70 px-2 py-1.5">
        <div className="flex flex-wrap items-center gap-1">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={preview}
              onClick={() => apply(t.id)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 disabled:opacity-40"
              title={t.label}
            >
              <t.icon className="h-4 w-4" />
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-slate-200" />
          {/* Quick Section Inserts */}
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              disabled={preview}
              onClick={() => insertSnippet('The Opportunity\nBriefly explain why this role exists and why someone should be excited to join.\n')}
              className="rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-40"
            >
              + Opportunity
            </button>
            <button
              type="button"
              disabled={preview}
              onClick={() => insertSnippet('You will be responsible for:\n- Point 1\n- Point 2\n- Point 3\n')}
              className="rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-40"
            >
              + Responsibilities
            </button>
            <button
              type="button"
              disabled={preview}
              onClick={() => insertSnippet('Compensation & Perks:\n- Competitive commission structure\n- Flexible hours & autonomy\n')}
              className="rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-40"
            >
              + Perks
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setPreview(!preview)}
          className={cn(
            'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-colors',
            preview ? 'bg-amber-400 text-slate-950 shadow-xs' : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
          )}
        >
          {preview ? <PencilLine className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {preview ? 'Edit' : 'Preview'}
        </button>
      </div>

      {preview ? (
        <div className="min-h-[140px] max-h-96 overflow-y-auto p-4 bg-slate-50/30">
          {value.trim() ? (
            <Markdown source={value} />
          ) : (
            <p className="text-xs italic text-slate-400">Nothing typed yet to preview.</p>
          )}
        </div>
      ) : (
        <Textarea
          id={id}
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          maxLength={maxLength}
          className="border-0 bg-transparent text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus-visible:ring-0"
        />
      )}
    </div>
  );
}
