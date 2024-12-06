// Types
export interface HttpResponse {
    data: any;
    message: string;
    status: number;
}

export type HttpStatus = 200 | 201 | 204 | 400 | 401 | 403 | 421 | 404 | 500;

  // Messages par défaut
export const DEFAULT_MESSAGES: Record<HttpStatus, string> = {
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
export interface HttpResponseOptions {
    data?: any;
    message?: string;
    status?: HttpStatus;
    headers?: Record<string, string>;
}