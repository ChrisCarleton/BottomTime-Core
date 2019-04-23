import { SearchUsers } from '../controllers/search.controller';

module.exports = app => {
	app.get('/search/users', SearchUsers);
};
