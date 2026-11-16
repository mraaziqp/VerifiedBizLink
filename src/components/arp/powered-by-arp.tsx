import { cn } from '@/lib/utils';

/**
 * POS and Build Studio are ARP Cloud Solutions products that VerifiedBizLink
 * offers its members. Every screen and receipt of those products carries
 * this mark. Plain text is used where a mark can't go (receipts, WhatsApp).
 */
export const ARP_NAME = 'ARP Cloud Solutions';
export const ARP_URL = 'https://arpcloudsolutions.co.za';
export const POWERED_BY_ARP = `Powered by ${ARP_NAME}`;

export function PoweredByArp({
  className,
  tone = 'light',
  size = 'sm',
}: {
  className?: string;
  /** light: on white/grey backgrounds. dark: on dark headers. */
  tone?: 'light' | 'dark';
  size?: 'xs' | 'sm';
}) {
  return (
    <a
      href={ARP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-semibold whitespace-nowrap transition-colors',
        size === 'xs' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]',
        tone === 'dark'
          ? 'border-white/20 bg-white/10 text-white/80 hover:bg-white/15'
          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
        className,
      )}
      title={`${ARP_NAME} — the company behind this tool`}
    >
      <span
        aria-hidden
        className={cn(
          'flex items-center justify-center rounded-[4px] font-black leading-none',
          size === 'xs' ? 'h-3.5 w-3.5 text-[7px]' : 'h-4 w-4 text-[8px]',
          tone === 'dark' ? 'bg-white text-slate-900' : 'bg-slate-900 text-white',
        )}
      >
        ARP
      </span>
      Powered by <span className="font-black">{ARP_NAME}</span>
    </a>
  );
}
