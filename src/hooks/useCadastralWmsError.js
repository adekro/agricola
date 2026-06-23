import { useEffect } from "react";
import { CADASTRAL_ERROR_EVENT } from "../lib/cadastralWms";

export function useCadastralWmsError(onError) {
  useEffect(() => {
    if (!onError) {
      return undefined;
    }

    const handleError = (event) => {
      onError(event.detail);
    };

    window.addEventListener(CADASTRAL_ERROR_EVENT, handleError);

    return () => {
      window.removeEventListener(CADASTRAL_ERROR_EVENT, handleError);
    };
  }, [onError]);
}
