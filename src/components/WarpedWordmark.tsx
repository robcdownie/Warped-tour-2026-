import { cx } from './ui';

/**
 * Text-based Warped Long Beach wordmark rendered from local fonts + SVG shapes.
 * No remote logo images (offline-safe, and avoids copying official artwork).
 */
export function WarpedWordmark({ className }: { className?: string }) {
  return (
    <div
      className={cx('relative flex select-none items-center', className)}
      aria-label="Warped Long Beach Companion"
      role="img"
    >
      <div className="flex flex-col items-center leading-none">
        <span
          className="font-display text-white"
          style={{
            fontSize: '18px',
            letterSpacing: '0.02em',
            textShadow: '2px 2px 0 #0a0f1c',
          }}
        >
          WARPED
        </span>
        <span
          className="font-display"
          style={{
            fontSize: '10px',
            letterSpacing: '0.14em',
            color: '#ffd21e',
            marginTop: '1px',
          }}
        >
          LONG BEACH
        </span>
      </div>
      <span
        aria-hidden
        className="ml-1.5 inline-block"
        style={{
          width: 0,
          height: 0,
          borderTop: '7px solid transparent',
          borderBottom: '7px solid transparent',
          borderLeft: '11px solid #ff2d78',
        }}
      />
    </div>
  );
}
