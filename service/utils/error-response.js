import { logError } from '../logger';

export const ErrorIds = {
	badRequest: 'bottom-time/errors/bad-request',
	conflict: 'bottom-time/errors/conflict',
	forbidden: 'bottom-time/errors/forbidden',
	notAuthorized: 'bottom-time/errors/unauthorized',
	notFound: 'bottom-time/errors/resource-not-found',
	serverError: 'bottom-time/errors/server-error'
};

export function notFound(req, res) {
	res.status(404).json({
		errorId: ErrorIds.notFound,
		status: 404,
		message: 'Resource not found.',
		details: `The requested resource at "${req.baseUrl}" could not be found. Please check the specified route for errors.`
	});
}

export function badRequest(message, error, res) {
	res.status(400).json({
		errorId: ErrorIds.badRequest,
		status: 400,
		message: message,
		details: error
	});
}

export function conflict(res, field, message) {
	res.status(409).json({
		errorId: ErrorIds.conflict,
		status: 409,
		fieldName: field,
		message: `There was a conflict in field ${field}.`,
		details: message
	});
}

export function unauthorized(res, message, details) {
	res.status(401).json({
		errorId: ErrorIds.notAuthorized,
		status: 401,
		message: message || 'The requested action requires authentication',
		details: details || 'Ensure that you are authenticated and providing the proper authorization tokens in your request.'
	});
}

export function forbidden(res, details) {
	res.status(403).json({
		errorId: ErrorIds.forbidden,
		status: 403,
		message: 'You do not have permission to perform the desired action.',
		details: details
	});
}

export function serverError(res, logId) {
	res.status(500).json({
		errorId: ErrorIds.serverError,
		logId: logId,
		status: 500,
		message: 'A server error occurred.',
		details: 'Your request could not be completed at this time. Please try again later.'
	});
}

export function serverErrorMiddleware(req, res, next) {
	try {
		next();
	} catch(err) {
		const logId = logError(
			`An unexpected server error has occurred.`,
			err);
		serverError(res, logId);
	}
}
