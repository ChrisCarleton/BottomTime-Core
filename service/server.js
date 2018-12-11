import applyAuth from './auth';
import bodyParser from 'body-parser';
import compression from 'compression';
import config from './config';
import express from 'express';
import glob from 'glob';
import http from 'http';
import log, { requestLogger } from './logger';
import { notFound } from './utils/error-response';
import path from 'path';
import { serverErrorMiddleware } from './utils/error-response';
import session from 'express-session';

// Wire up process-wide event handlers.
process.on('unhandledRejection', (reason, p) => {
	log.fatal('Catastrophic failure - unhandled rejection! Details:', {
		reason: reason,
		promise: p
	});
	process.exit(187);
});

process.on('uncaughtException', err => {
	// This is pretty serious... end the process because it's likely
	// we're in an inconsistent state.
	log.fatal('Catastrophic failure - unhandled exception! Details:', err);
	process.exit(187);
});

// Express middleware
const app = express();

app.use(compression());
app.use(session({
	resave: true,
	saveUninitialized: false,
	secret: config.sessionSecret
}));
app.use(bodyParser.json());
applyAuth(app);
app.use(requestLogger);
app.use(serverErrorMiddleware);

// Load routes
glob.sync(path.join(__dirname, 'routes/*.routes.js')).forEach(loader => {
	log.debug('Route loader:', loader);
	require(loader)(app);
});

// Generic 404 for all other routes
app.all('*', (req, res) => {
	notFound(req, res);
});


// Launch server
const server = http.createServer(app);
server.listen(config.port);
log.info(`Service is now listening on port ${config.port}.`);

export const App = app;
export const Server = server;
