import { Client } from 'elasticsearch';
import config from '../config';

const client = new Client({
	node: config.elasticSearchEndpoint
});

export default client;
