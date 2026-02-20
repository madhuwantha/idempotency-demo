/**
 * Builds a conflict error.
 * Returns a conflict error with the message and code.
 */
export const buildConflictError = (message: string, code: string): Error & {
    httpStatus: number;
    responseBody: { error: string; code: string };
} => {
    const error = new Error(message) as Error & {
        httpStatus: number;
        responseBody: { error: string; code: string };
    };
    error.httpStatus = 409;
    error.responseBody = { error: message, code };
    return error;
};

/**
 * Builds a server error.
 * Returns a server error with the message and details.
 */
export const buildServerError = (message: string): Error & {
    httpStatus: number;
    responseBody: { error: string; details: string };
} => {
    const error = new Error(message) as Error & {
        httpStatus: number;
        responseBody: { error: string; details: string };
    };
    error.httpStatus = 500;
    error.responseBody = {
        error: 'Failed to create booking',
        details: message
    };
    return error;
};