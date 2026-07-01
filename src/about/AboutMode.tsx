import { useEffect, useState } from 'react';
import { getApp } from '../lib/bridge';

export function AboutMode() {
  const [version, setVersion] = useState('');

  useEffect(() => {
    const app = getApp();
    if (!app) return;
    void app.getVersion().then(setVersion);
  }, []);

  return (
    <div className="simple-page panel">
      <h2>About Song Pages</h2>
      <p className="about-meta">
        Song Pages {version || '…'} — Proof of Concept
        <br />
        © Ben Sawyer
        <br />
        Personal and confidential. Do not distribute without permission.
      </p>
    </div>
  );
}
