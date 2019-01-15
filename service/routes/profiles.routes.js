import {
	AssertUserReadPermission,
	AssertUserWritePermission,
	RetrieveUserAccount
} from '../controllers/security.controller';
import {
	GetProfile,
	UpdateProfile
} from '../controllers/profiles.controller';

module.exports = app => {
	app.route('/users/:username/profile')
		.get(RetrieveUserAccount, AssertUserReadPermission, GetProfile)
		.patch(RetrieveUserAccount, AssertUserWritePermission, UpdateProfile);
};
