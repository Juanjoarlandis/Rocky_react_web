import { useCallback, useState } from 'react';
import { logoutCustomerAccount } from './api.js';
import { errorMessage } from '../utils/errors.js';

export const ANONYMOUS_ACCOUNT = Object.freeze({ loggedIn: false, customer: null });

/* La cuenta de cliente: quién está dentro y cómo se sale. La primera lectura
   la hace useStorefrontStatus (fallo cerrado); aquí sólo se guarda y se
   cierra sesión. */
export function useCustomerAccount({ onError } = {}) {
  const [account, setAccount] = useState(ANONYMOUS_ACCOUNT);

  const applyAccount = useCallback((next) => {
    setAccount(next && typeof next === 'object' ? next : ANONYMOUS_ACCOUNT);
  }, []);

  const logout = useCallback(async () => {
    onError?.('');
    try {
      const response = await logoutCustomerAccount();
      setAccount(ANONYMOUS_ACCOUNT);
      return response.logoutUrl || null;
    } catch (logoutError) {
      onError?.(errorMessage(logoutError));
      throw logoutError;
    }
  }, [onError]);

  return { account, applyAccount, logout };
}
