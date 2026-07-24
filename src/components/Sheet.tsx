import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cx } from './ui';

/** Bottom sheet / modal used for artist detail, import flows, confirmations. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'auto',
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'auto' | 'tall' | 'full';
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div
        className={cx(
          'relative z-10 mx-auto w-full max-w-[560px] rounded-t-3xl',
          'surface-card border-b-0 shadow-2xl',
          size === 'full' && 'h-[92vh]',
          size === 'tall' && 'h-[80vh]',
        )}
        style={{ background: 'var(--surface-card)' }}
      >
        <div className="flex items-center justify-between border-b border-subtle px-4 py-3">
          <div className="font-display text-[16px] text-primary">{title}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="min-h-touch min-w-touch -mr-2 flex items-center justify-center rounded-xl text-secondary active:bg-black/5"
          >
            <X size={22} aria-hidden />
          </button>
        </div>
        <div
          className={cx(
            'overflow-y-auto px-4 py-4',
            size === 'auto' ? 'max-h-[70vh]' : 'flex-1',
          )}
          style={{
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)',
          }}
        >
          {children}
        </div>
        {footer && (
          <div
            className="border-t border-subtle px-4 py-3"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
