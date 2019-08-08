import chai from 'chai';
import chaiSorted from 'chai-sorted';
import database from '../service/data/database';
import errorResponseAssertions from './util/error-response-assertions';
import mkdirp from 'mkdirp';
import path from 'path';
import search from '../service/search';
import { Server } from '../service/server';

chai.use(chaiSorted);
chai.use(errorResponseAssertions);

before(done => {
	mkdirp.sync(path.resolve(__dirname, '../temp/media/images'), '0770');

	// Make sure the MongoDB connection is open before running any tests.
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
