import useLocalStorage from "../hooks/useLocalStorage.js";
import { defaultVisibility } from "../utils/helpers.js";
import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "react";
import { isSupabaseEnabled, onAuth, getUser } from "../services/supabase.js";

const AppContext = createContext(null);

const initialState = {
  loggedIn: false,
  courses: [],
  activeCourseId: null,
  settings: { visible: defaultVisibility() },
};

export function AppProvider({ children }) {
  const [state, setState] = useLocalStorage("taAppReact", initialState);
  const [view, setView] = useState(state.loggedIn ? "courses" : "login");
  const activeCourse = useMemo(
    () => state.courses.find((c) => c.id === state.activeCourseId) || null,
    [state.courses, state.activeCourseId]
  );
  const update = (updater) => {
    setState((prev) =>
      typeof updater === "function" ? updater(prev) : updater
    );
  };
  const go = (v) => setView(v);
  useEffect(() => {
    if (!isSupabaseEnabled()) {
      setView(state.loggedIn ? "courses" : "login");
      return;
    }
    (async () => {
      const user = await getUser();
      setState((prev) => ({ ...prev, loggedIn: !!user }));
      setView(user ? "courses" : "login");
    })();
    const off = onAuth((user) => {
      setState((prev) => ({ ...prev, loggedIn: !!user }));
      setView(user ? "courses" : "login");
    });
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const value = { state, setState, update, view, go, activeCourse };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
