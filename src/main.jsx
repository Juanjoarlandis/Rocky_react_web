import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import {
  clearPreloadRecoveryGuardAfterBoot,
  installPreloadRecovery,
} from './preloadRecovery';
import './index.css';

installPreloadRecovery();

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

clearPreloadRecoveryGuardAfterBoot();
