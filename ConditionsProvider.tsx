'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { DEFAULT_CONDITIONS, type Conditions } from '@/lib/conditions';
import ConditionsSheet from './ConditionsSheet';

const KEY = 'jt-conditions-v1';
type Ctx = {
  conditions: Conditions;
  setConditions: (c: Conditions) => void;
  openSheet: () => void;
  ready: boolean;
};
const C = createContext<Ctx | null>(null);

export function useConditions(): Ctx {
  const v = useContext(C);
  if (!v) throw new Error('ConditionsProvider missing');
  return v;
}

export default function ConditionsProvider({ children }: { children: React.ReactNode }) {
  const [conditions, setState] = useState<Conditions>(DEFAULT_CONDITIONS);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const s = localStorage.getItem(KEY);
      if (s) setState({ ...DEFAULT_CONDITIONS, ...JSON.parse(s) });
    } catch {}
    setReady(true);
  }, []);

  const setConditions = useCallback((c: Conditions) => {
    setState(c);
    try {
      localStorage.setItem(KEY, JSON.stringify(c));
    } catch {}
  }, []);

  return (
    <C.Provider value={{ conditions, setConditions, openSheet: () => setOpen(true), ready }}>
      {children}
      {open && (
        <ConditionsSheet
          initial={conditions}
          onClose={() => setOpen(false)}
          onSave={(c) => {
            setConditions({ ...c, setupDone: true });
            setOpen(false);
          }}
        />
      )}
    </C.Provider>
  );
}
