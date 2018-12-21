import {
	ChangePassword,
	ConfirmPasswordReset,
	CreateUserAccount,
	RequestPasswordReset,
	RequireAccountPermission
} from '../controllers/users.controller';

module.exports = app => {
	app.put('/users/:username', CreateUserAccount);
	app.post('/users/:username/changePassword', RequireAccountPermission, ChangePassword);
	app.post('/users/:username/resetPassword', RequestPasswordReset);
	app.post('/users/:username/confirmResetPassword', ConfirmPasswordReset);
};
