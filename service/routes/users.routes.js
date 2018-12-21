import {
	ChangePassword,
	CreateUserAccount,
	RequireAccountPermission
} from '../controllers/users.controller';

module.exports = app => {
	app.put('/users/:username', CreateUserAccount);
	app.post('/users/:username/changePassword', RequireAccountPermission, ChangePassword);
};
