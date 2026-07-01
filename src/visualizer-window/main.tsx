import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { VisualizerWindowApp } from './VisualizerWindowApp';
import '../styles/themes.css';
import '../styles/app.css';
import '../styles/visualizer.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <VisualizerWindowApp />
  </StrictMode>,
);
