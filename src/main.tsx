import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { registerBuiltins } from './algorithms/register';
import { initTheme } from './store/themeStore';
import './styles/globals.css';

// Boot order matters: theme first (so the first paint is correct), then the
// registry (so the first route can resolve a module synchronously if cached).
initTheme();
registerBuiltins();

const container = document.getElementById('root');
if (!container) throw new Error('[AlgoVerse] #root element is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </BrowserRouter>
  </StrictMode>,
);
