import { useState, useCallback } from 'react';
import { getFarmerFriendlyMessage } from '../utils/errorMessages';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApiState<T>() {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const run = useCallback(async (promise: Promise<T>): Promise<T | null> => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const data = await promise;
      setState({ data, loading: false, error: null });
      return data;
    } catch (err: any) {
      const code = err?.response?.data?.error?.code || err?.code || 'UNKNOWN_ERROR';
      const message = err?.response?.data?.error?.message || err?.message || '';
      const friendlyMessage = getFarmerFriendlyMessage(code);
      setState({ data: null, loading: false, error: friendlyMessage });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  const setData = useCallback((data: T | null) => {
    setState(s => ({ ...s, data }));
  }, []);

  return {
    ...state,
    run,
    reset,
    setData,
  };
}
