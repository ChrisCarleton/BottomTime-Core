import database from '../service/data/database';
import { Server } from '../service/server';

after(() => {
	Server.close();
	database.connection.close();
});
