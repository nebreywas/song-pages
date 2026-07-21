import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/themes.css';
import './styles/select.css';
import './styles/app.css';
import './pretty-lyrics/pretty-lyrics-lab.css';
import './web-voice/web-voice-demo.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
