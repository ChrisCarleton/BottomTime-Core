import {
	AdminGetUsers,
	ChangePassword,
	CompleteRegistration,
	ConfirmPasswordReset,
	CreateUserAccount,
	GetUserAccount,
	GetUsers,
	RequestPasswordReset,
	RequireAccountPermission,
	RequireUserForRegistration
} from '../controllers/users.controller';
import { RequireUser } from '../controllers/security.controller';

module.exports = app => {
	app.get('/users', RequireUser, GetUsers, AdminGetUsers);
	app.get('/users/:username', GetUserAccount);
	app.put('/users/:username', CreateUserAccount);
	app.post('/users/:username/changePassword', RequireUser, RequireAccountPermission, ChangePassword);
	app.post('/users/:username/resetPassword', RequestPasswordReset);
	app.post('/users/:username/confirmResetPassword', ConfirmPasswordReset);
	app.post(
		'/users/:username/completeRegistration',
		RequireUserForRegistration,
		RequireAccountPermission,
		CompleteRegistration
	);
};
