import database from '../service/data/database';
import search from '../service/search';
import { Server } from '../service/server';

before(done => {
	// Make sure the MongoDB and ES connections are open before running any tests.
	database.connection.once('open', async err => {
		await search.ping();
		done(err);
	});
});

after(() => {
	Server.close();
	search.close();
	database.connection.close();
});
