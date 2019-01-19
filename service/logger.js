import bunyan from 'bunyan';
import config from './config';
import containerMetadata from './utils/container-metadata';
import expressLogger from 'express-bunyan-logger';
import uuid from 'uuid/v4';

let stream = null;

if (config.logFileName) {
	stream = {
		path: config.logFileName
	};
} else {
	stream = {
		stream: process.stdout
	};
}

const logger = bunyan.createLogger({
	name: 'bt_log_main',
	level: config.logLevel,
	streams: [ stream ]
});

export const requestLogger = expressLogger({
	name: 'bt_log_request',
	level: config.logLevel,
	streams: [ stream ],
	excludes: [
		'req-headers',
		'res-headers',
		'body',
		'short-body',
		'req',
		'res',
		'response-hrtime',
		'user-agent'
	],
	includesFn: req => ({
		user: req.user ? req.user.username : '<anonymous>',
		ecsInstanceId: containerMetadata.ContainerInstanceARN,
		ecsTaskId: containerMetadata.TaskARN,
		device: `${ req.useragent.platform } / ${ req.useragent.os } / ${ req.useragent.browser }`
	})
});

export default logger;

export function logError(message, details) {
	const logId = uuid();
	logger.error({
		logId,
		message,
		details,
		ecsInstanceId: containerMetadata.ContainerInstanceARN,
		ecsTaskId: containerMetadata.TaskARN
	});
	return logId;
}
