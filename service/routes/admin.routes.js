import { GetHealth, GetVersion } from '../controllers/admin.controller';

module.exports = app => {
	app.get('/health', GetHealth);
	app.get('/', GetVersion);
};
