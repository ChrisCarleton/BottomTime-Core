import database from '../service/data/database';
import { Server } from '../service/server';

// Make sure the MongoDB connection is open before running any tests.
before(done => {
	database.connection.once('open', done);
});

after(() => {
	Server.close();
	database.connection.close();
});
