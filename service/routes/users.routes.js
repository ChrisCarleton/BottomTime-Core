import {
	AdminGetUsers,
	ChangePassword,
	ConfirmPasswordReset,
	CreateUserAccount,
	GetUsers,
	RequestPasswordReset,
	RequireAccountPermission
} from '../controllers/users.controller';
import { RequireUser } from '../controllers/security.controller';

module.exports = app => {
	app.get('/users', RequireUser, GetUsers, AdminGetUsers);
	app.put('/users/:username', CreateUserAccount);
	app.post('/users/:username/changePassword', RequireAccountPermission, ChangePassword);
	app.post('/users/:username/resetPassword', RequestPasswordReset);
	app.post('/users/:username/confirmResetPassword', ConfirmPasswordReset);
};
