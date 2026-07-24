import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/** Friendly empty/placeholder state — never a blank screen (spec §32). */
export function EmptyState({
  Icon,
  title,
  message,
  action,
}: {
  Icon: LucideIcon;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-subtle px-6 py-10 text-center">
      <Icon size={36} className="text-warp-blue-400" aria-hidden />
      <h3 className="font-display text-[16px] text-primary">{title}</h3>
      {message && <p className="max-w-[36ch] text-[14px] text-secondary">{message}</p>}
      {action}
    </div>
  );
}
