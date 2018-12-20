import {
	CreateUserAccount
} from '../controllers/users.controller';

module.exports = app => {
	app.put('/users/:username', CreateUserAccount);
};
