import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { VisualizerWindowApp } from './VisualizerWindowApp';
import '../styles/themes.css';
import '../styles/select.css';
import '../styles/app.css';
import '../styles/sunoDemo.css';
import '../styles/visualizer.css';
// Pretty Lyrics token styles live here — without them projector song pages look like gray chips.
import '../pretty-lyrics/pretty-lyrics-lab.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <VisualizerWindowApp />
  </StrictMode>,
);
