// Types
interface HttpResponse {
  data: any;
  message: string;
  status: number;
}

type HttpStatus = 200 | 201 | 204 | 400 | 401 | 403 | 421 | 404 | 500;

// Messages par défaut
const DEFAULT_MESSAGES: Record<HttpStatus, string> = {
  200: 'Operation successful',
  201: 'Resource created successfully',
  204: 'Resource deleted successfully',
  400: 'Bad request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Resource not found',
  421: 'Invalid data',
  500: 'Internal server error'
};

// Options pour la fonction
interface HttpResponseOptions {
  data?: any;
  message?: string;
  status?: HttpStatus;
  headers?: Record<string, string>;
}
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