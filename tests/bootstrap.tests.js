import chai from 'chai';
import chaiHttp from 'chai-http';
import database from '../service/data/database';

import { Server } from '../service/server';

before(() => {
	chai.use(chaiHttp);
});

after(() => {
	Server.close();
	database.connection.close();
});
