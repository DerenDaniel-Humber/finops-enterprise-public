import { useEffect, useState } from "react";
import { api } from "./api";
export function useResource(path) {
  const [state, setState] = useState({
    loading: true,
    data: null,
    error: null,
  });
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true, data: null, error: null });
    api(path, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted)
          setState({ loading: false, data, error: null });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({ loading: false, data: null, error });
      });
    return () => controller.abort();
  }, [path, reload]);
  return { ...state, retry: () => setReload((n) => n + 1) };
}
