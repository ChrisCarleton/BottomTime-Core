import passport from 'passport';

export function AuthenticateUser(req, res, next) {
	passport.authenticate('local', (err, user, info) => {
		// TODO: Authenticate.
		info();
	})(req, res, next);
}

export function Login(req, res) {
	res.sendStatus(501);
}

export function Logout(req, res) {
	res.sendStatus(501);
}

export function GoogleAuth(req, res) {
	res.sendStatus(501);
}

export function GoogleCallback(req, res) {
	res.sendStatus(501);
}
