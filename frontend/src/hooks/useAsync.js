import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Minimal async data hook: tracks { data, loading, error } and gives you a
 * `run` function to re-trigger the request (and to fetch with arguments).
 *
 * Usage:
 *   const { data, loading, error, run } = useAsync(() => getStudent(roll), [roll]);
 *
 * Implemented without synchronous setState during render/effect so it plays
 * nicely with the current React lint rules.
 */
export function useAsync(fn, deps = [], { immediate = true } = {}) {
  const [state, setState] = useState({
    data: null,
    loading: immediate,
    error: null,
  });
  const mountedRef = useRef(true);
  const fnRef = useRef(fn);

  // Keep the latest callback without writing refs during render.
  useEffect(() => {
    fnRef.current = fn;
  });

  const run = useCallback((...args) => {
    return Promise.resolve()
      .then(() => {
        if (mountedRef.current) {
          setState((prev) => ({ ...prev, loading: true, error: null }));
        }
        return fnRef.current(...args);
      })
      .then((data) => {
        if (mountedRef.current) setState({ data, loading: false, error: null });
        return data;
      })
      .catch((error) => {
        if (mountedRef.current) setState({ data: null, loading: false, error });
        return null;
      });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (immediate) run();
    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...state, run, setData: (data) => setState((s) => ({ ...s, data })) };
}

export default useAsync;