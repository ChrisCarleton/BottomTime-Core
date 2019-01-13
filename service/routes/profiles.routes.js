import {
	GetProfile,
	UpdateProfile
} from '../controllers/profiles.controller';
import {
	AssertUserReadPermission,
	RetrieveUserAccount
} from '../controllers/security.controller';

module.exports = app => {
	app.route('/users/:username/profile')
		.get(RetrieveUserAccount, AssertUserReadPermission, GetProfile)
		.put(RetrieveUserAccount, UpdateProfile);
};
