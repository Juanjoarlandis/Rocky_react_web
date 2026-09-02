import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import {
  clearPreloadRecoveryGuardAfterBoot,
  installPreloadRecovery,
} from './preloadRecovery';

installPreloadRecovery();

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

clearPreloadRecoveryGuardAfterBoot();
