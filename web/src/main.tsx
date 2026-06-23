import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import { initAdapter } from './lib/adapter';

async function bootstrap() {
  try {
    await initAdapter();
  } catch (e) {
    console.warn('Adapter init failed, some features may not work:', e);
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

bootstrap();
