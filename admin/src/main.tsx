import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { SessionProvider } from './session/SessionProvider.tsx';
import './index.css';

const root = document.getElementById('root');
if (!root) {
    throw new Error('Root element was not found.');
}

createRoot(root).render(
    <StrictMode>
        <SessionProvider>
            <App />
        </SessionProvider>
    </StrictMode>,
);
