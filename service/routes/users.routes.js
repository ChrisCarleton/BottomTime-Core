import {
	AdminGetUsers,
	ChangeEmail,
	ChangePassword,
	CompleteRegistration,
	ConfirmPasswordReset,
	CreateUserAccount,
	GetUserAccount,
	GetUsers,
	RequireAccountPermission,
	RequireUserForRegistration,
	UpdateLockStatus
} from '../controllers/users.controller';
import { RequireAdminUser, RequireUser } from '../controllers/security.controller';

module.exports = app => {
	app.get('/users', RequireUser, GetUsers, AdminGetUsers);
	app.get('/users/:username', RequireAdminUser, GetUserAccount);
	app.put('/users/:username', CreateUserAccount);
	app.post('/users/:username/changeEmail', RequireUser, RequireAccountPermission, ChangeEmail);
	app.post('/users/:username/changePassword', RequireUser, RequireAccountPermission, ChangePassword);
	app.post('/users/:username/confirmResetPassword', ConfirmPasswordReset);
	app.post(
		'/users/:username/completeRegistration',
		RequireUserForRegistration,
		RequireAccountPermission,
		CompleteRegistration
	);
	app.post('/users/:username/:lockStatus(lock|unlock)', RequireAdminUser, UpdateLockStatus);
};
