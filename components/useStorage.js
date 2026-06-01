import { useState, useEffect } from 'react';

export function useStorage(key, initialValue) {
  const [value, setValue] = useState(initialValue);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        setValue(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Erreur lecture localStorage:', e);
    }
    setLoaded(true);
  }, [key]);

  const setAndStore = (newValue) => {
    try {
      const toStore = typeof newValue === 'function' ? newValue(value) : newValue;
      setValue(toStore);
      localStorage.setItem(key, JSON.stringify(toStore));
    } catch (e) {
      console.warn('Erreur écriture localStorage:', e);
    }
  };

  return [value, setAndStore, loaded];
}
