import chai from 'chai';
import chaiHttp from 'chai-http';

import { Server } from '../service/server';

before(() => {
	chai.use(chaiHttp);
});

after(() => {
	Server.close();
});
