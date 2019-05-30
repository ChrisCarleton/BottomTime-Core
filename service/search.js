import { Client } from '@elastic/elasticsearch';
import config from './config';
import { esLogger as log } from './logger';

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
	log: ESLogger,
	keepAlive: false
});

module.exports = client;
export default client;
