import chai from 'chai';
import chaiSorted from 'chai-sorted';
import database from '../service/data/database';
import errorResponseAssertions from './util/error-response-assertions';
import search from '../service/search';
import { Server } from '../service/server';

chai.use(chaiSorted);
chai.use(errorResponseAssertions);

// Make sure the MongoDB connection is open before running any tests.
before(done => {
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
