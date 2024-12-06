import { HttpResponseOptions, DEFAULT_MESSAGES, HttpResponse } from "~~/shared/types/http";

export const createHttpResponse = (options: HttpResponseOptions = {}) => {
  const {
    data = null,
    status = 200,
    message = DEFAULT_MESSAGES[status],
    headers = {}
  } = options;

  // Définir les headers par défaut
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...headers
  };

  // Définir les headers avec Nitro
  const event = useEvent();

  // Définir le status HTTP
  setResponseStatus(event, status);

  // Définir les headers
  Object.entries(defaultHeaders).forEach(([key, value]) => {
    setHeader(event, key, value);
  });

  // Construire la réponse
  const response: HttpResponse = {
    data,
    message,
    status
  };

  return response;
};