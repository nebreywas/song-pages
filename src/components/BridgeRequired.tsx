import { BROWSER_ONLY_MESSAGE } from '../lib/bridge';

export function BridgeRequired({ children }: { children: React.ReactNode }) {
  if (typeof window !== 'undefined' && window.app) {
    return <>{children}</>;
  }

  return (
    <div className="bridge-required">
      <div className="bridge-required-card panel">
        <h2>Electron required</h2>
        <p>{BROWSER_ONLY_MESSAGE}</p>
        <p className="bridge-required-hint">
          If you already ran <code>npm run dev</code>, look for the separate desktop window titled{' '}
          <strong>Song Pages</strong> — do not use Cursor&apos;s browser preview or Safari/Chrome.
        </p>
      </div>
    </div>
  );
}
