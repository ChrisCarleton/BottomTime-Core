export async function GetProfile(req, res) {
	res.json({
		...req.account.getProfileJSON(),
		bottomTimeLogged: -1,
		divesLogged: -1
	});
}

export async function UpdateProfile(req, res) {

}
