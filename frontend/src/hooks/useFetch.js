import { useCallback, useEffect, useState } from "react";
import api, { errMsg } from "../api/client.js";


export default function useFetch(url, params, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    if (!url) return;
    setLoading(true);
    setError("");
    api.get(url, { params })
      .then((r) => setData(r.data))
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
    
  }, [url, JSON.stringify(params), ...deps]);

  useEffect(load, [load]);
  return { data, loading, error, reload: load, setData };
}
