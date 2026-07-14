import {StrictMode, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';

window.addEventListener('error', (event) => {
  if (event.error && typeof event.error === 'object') {
    console.error('CRITICAL GLOBAL ERROR DETECTED:', JSON.stringify(event.error, Object.getOwnPropertyNames(event.error), 2));
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('UNHANDLED PROMISE REJECTION:', event.reason);
  if (event.reason && typeof event.reason === 'object') {
    try {
      console.error('REJECTION DETAILS:', JSON.stringify(event.reason, Object.getOwnPropertyNames(event.reason), 2));
    } catch (e) {
      console.error('Could not stringify rejection reason', event.reason);
    }
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Suspense fallback={<div style={{padding: '2rem', color: 'white'}}>Loading App...</div>}>
        <App />
      </Suspense>
    </ErrorBoundary>
  </StrictMode>,
);
