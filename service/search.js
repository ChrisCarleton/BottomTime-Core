import { Client } from '@elastic/elasticsearch';
import config from './config';
import logger, { esLogger as log } from './logger';

class ESLogger {
	constructor() {
		this.logger = log;
		this.error = log.error.bind(log);
		this.warning = log.warn.bind(log);
		this.info = log.info.bind(log);
		this.debug = log.debug.bind(log);
		this.trace = log.trace.bind(log);
		this.close = () => {
			/* Bunyan loggers do not need to be closed. */
		};
	}
}

const client = new Client({
	node: config.elasticSearchEndpoint,
	sniffOnStart: true,
	sniffInterval: 300000,
	connectionClass: 'http',
	log: ESLogger
});

// Wait for connection pool.
(async () => {
	logger.debug('Attempting to connect to ElasticSearch...');
	try {
		await client.ping();
		await client.cluster.health();
	} catch (err) {
		logger.warn('Failed to establish connection to ElasticSearch', err);
	}
})();

module.exports = client;
export default client;
