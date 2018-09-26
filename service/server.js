import applyAuth from './auth';
import bodyParser from 'body-parser';
import config from './config';
import express from 'express';
import glob from 'glob';
import http from 'http';
import log, { requestLogger } from './logger';
import path from 'path';
import session from 'express-session';

const app = express();

app.use(session({
	resave: true,
	saveUninitialized: false,
	secret: config.sessionSecret
}));
app.use(bodyParser.json());
applyAuth(app);
app.use(requestLogger);

glob.sync(path.join(__dirname, 'routes/*.routes.js')).forEach(loader => {
	log.debug('Route loader:', loader);
	require(loader)(app);
});

app.all('*', (req, res) => {
	res.status(404).json({
		status: 404,
		message: 'Route not found.'
	});
});

const server = http.createServer(app);
server.listen(config.port);
log.info(`Service is now listening on port ${config.port}.`);

export const App = app;
export const Server = server;
