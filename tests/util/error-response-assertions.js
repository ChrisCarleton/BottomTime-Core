/* eslint no-invalid-this: 0 */

import { ErrorIds } from '../../service/utils/error-response';

function isServerError(expect, obj) {
	expect(obj).to.exist;
	expect(obj.logId).to.be.a('string');
	expect(obj.status).to.equal(500);
	expect(obj.errorId).to.equal(ErrorIds.serverError);
}

function isNotFound(expect, obj) {
	expect(obj).to.exist;
	expect(obj.status).to.equal(404);
	expect(obj.errorId).to.equal(ErrorIds.notFound);
}

function isBadRequest(expect, obj) {
	expect(obj).to.exist;
	expect(obj.status).to.equal(400);
	expect(obj.errorId).to.equal(ErrorIds.badRequest);
	expect(obj.details).to.exist;
}

function isConflict(expect, obj) {
	expect(obj).to.exist;
	expect(obj.status).to.equal(409);
	expect(obj.errorId).to.equal(ErrorIds.conflict);
}

function isUnauthorized(expect, obj) {
	expect(obj).to.exist;
	expect(obj.status).to.equal(401);
	expect(obj.errorId).to.equal(ErrorIds.notAuthorized);
}

function isForbidden(expect, obj) {
	expect(obj).to.exist;
	expect(obj.status).to.equal(403);
	expect(obj.errorId).to.equal(ErrorIds.forbidden);
}

export default function errorResponseAssertions(chai, utils) {
	const { Assertion, expect } = chai;
	utils.addProperty(
		Assertion.prototype,
		'isServerError',
		function () {
			isServerError(expect, this._obj);
		}
	);

	utils.addProperty(
		Assertion.prototype,
		'isNotFound',
		function () {
			isNotFound(expect, this._obj);
		}
	);

	utils.addProperty(
		Assertion.prototype,
		'isBadRequest',
		function () {
			isBadRequest(expect, this._obj);
		}
	);

	utils.addProperty(
		Assertion.prototype,
		'isConflict',
		function () {
			isConflict(expect, this._obj);
		}
	);

	utils.addProperty(
		Assertion.prototype,
		'isUnauthorized',
		function () {
			isUnauthorized(expect, this._obj);
		}
	);

	utils.addProperty(
		Assertion.prototype,
		'isForbidden',
		function () {
			isForbidden(expect, this._obj);
		}
	);
}
