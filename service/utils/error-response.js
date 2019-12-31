import { EmailTakenError, SsoError } from './errors';
import containerMetadata from '../utils/container-metadata';
import uuid from 'uuid/v4';

export const ErrorIds = {
	authError: 'bottom-time/errors/auth',
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
		details: `The requested resource at "${ req.baseUrl }" could not be found. `
			+ 'Please check the specified route for errors.'
	});
}

export function badRequest(message, error, res) {
	res.status(400).json({
		errorId: ErrorIds.badRequest,
		status: 400,
		message,
		details: error
	});
}

export function conflict(res, field, message) {
	res.status(409).json({
		errorId: ErrorIds.conflict,
		status: 409,
		fieldName: field,
		message: `There was a conflict in field ${ field }.`,
		details: message
	});
}

export function unauthorized(res, message, details) {
	res.status(401).json({
		errorId: ErrorIds.notAuthorized,
		status: 401,
		message: message || 'The requested action requires authentication',
		details:
			details
			|| 'Ensure that you are authenticated and providing the proper authorization tokens in your request.'
	});
}

export function forbidden(res, details) {
	res.status(403).json({
		errorId: ErrorIds.forbidden,
		status: 403,
		message: 'You do not have permission to perform the desired action.',
		details
	});
}

export function serverError(res, logId) {
	res.status(500).json({
		errorId: ErrorIds.serverError,
		logId,
		status: 500,
		message: 'A server error occurred.',
		details: 'Your request could not be completed at this time. Please try again later.'
	});
}

export function serverErrorMiddleware(req, res, next) {
	req.logError = function (message, details) {
		const logId = uuid();
		req.log.error({
			logId,
			message,
			details,
			ecsInstanceId: containerMetadata.ContainerInstanceARN,
			ecsTaskId: containerMetadata.TaskARN
		});
		return logId;
	};

	return next();
}

/* eslint-disable no-unused-vars */
// The 'next' parameter is required. Express looks for a function with four parameters to treat it
// as an error handler.
export function handleServerError(err, req, res, next) {
	// Errors relating to failed 3rd party sign-in are not handled like normal API calls.
	if (err instanceof EmailTakenError) {
		res.redirect(`/emailTaken/${ req.authProvider }`);
	} else if (err instanceof SsoError) {
		req.logError('SSO authentication failed', err);
		res.redirect('/serverError');
	} else {
		const logId = req.logError('An unhandled server error has occured', err);
		serverError(res, logId);
	}
}
/* eslint-enable no-unused-vars */
