import { createRoot } from 'react-dom/client';

import '../styles/themes.css';
import '../styles/app.css';
import './controller.css';
import { ControllerWindowApp } from './ControllerWindowApp';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<ControllerWindowApp />);
}
