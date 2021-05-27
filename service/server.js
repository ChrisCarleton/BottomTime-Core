/* eslint no-process-exit: 0 */

import applyAuth from './auth';
import bodyParser from 'body-parser';
import compression from 'compression';
import containerMetadata from './utils/container-metadata';
import config from './config';
import cookieParser from 'cookie-parser';
import express from 'express';
import glob from 'glob';
import http from 'http';
import log, { requestLogger } from './logger';
import modRewrite from 'connect-modrewrite';
import MongoStore from 'connect-mongo';
import { handleServerError, notFound, serverErrorMiddleware } from './utils/error-response';
import path from 'path';
import session from 'express-session';
import useragent from 'express-useragent';

// Wire up process-wide event handlers.
process.on('unhandledRejection', (reason, p) => {
	log.fatal('Catastrophic failure - unhandled rejection! Details:', {
		reason,
		promise: p,
		ecsInstanceId: containerMetadata.ContainerInstanceARN,
		ecsTaskId: containerMetadata.TaskARN
	});
	process.exit(187);
});

process.on('uncaughtException', err => {
	// This is pretty serious... end the process because it's likely
	// we're in an inconsistent state.
	log.fatal(
		'Catastrophic failure - unhandled exception! Details:',
		{
			ecsInstanceId: containerMetadata.ContainerInstanceARN,
			ecsTaskId: containerMetadata.TaskARN
		},
		err);
	process.exit(187);
});

const mongoStore = MongoStore.create({
	mongoUrl: config.mongoEndpoint,
	autoRemove: 'interval',
	autoRemoveInterval: 30
});

// Express middleware
const app = express();
app.use(compression());
app.use(useragent.express());
app.use(modRewrite([ '^/api/(.*) /$1' ]));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({
	secret: config.sessionSecret,
	resave: true,
	saveUninitialized: true,
	store: mongoStore
}));
app.use(requestLogger);
app.use(serverErrorMiddleware);
applyAuth(app);

// Load routes
glob.sync(path.join(__dirname, 'routes/*.routes.js')).forEach(loader => {
	log.debug('Route loader:', loader);
	require(loader)(app);
});

// Generic 404 for all other routes
app.all('*', (req, res) => {
	notFound(req, res);
});

// Error handler
app.use(handleServerError);

// Launch server
const server = http.createServer(app);
server.listen(config.port);
log.info(`Service is now listening on port ${ config.port }.`);

export const App = app;
export const Server = server;
export const SessionStore = mongoStore;
