import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { VcWindowApp } from './VcWindowApp';
import '../styles/themes.css';
import '../styles/app.css';
import '../styles/visualizer.css';
import '../vc-mode/vcMode.css';
import './vc-window.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <VcWindowApp />
  </StrictMode>,
);
