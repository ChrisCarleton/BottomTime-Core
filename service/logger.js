import bunyan from 'bunyan';
import config from './config';
import containerMetadata from './utils/container-metadata';
import expressLogger from 'express-bunyan-logger';

const streams = [];

if (config.logFileName) {
	streams.push({
		path: config.logFileName
	});
	streams.push({
		stream: process.stdout,
		level: 'fatal'
	});
} else {
	streams.push({
		stream: process.stdout
	});
}

const logger = bunyan.createLogger({
	name: 'bt_log_main',
	level: config.logLevel,
	streams
});

export const esLogger = bunyan.createLogger({
	name: 'bt_log_elasticsearch',
	level: config.logLevel,
	streams
});

export const requestLogger = expressLogger({
	name: 'bt_log_request',
	level: config.logLevel,
	streams,
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
