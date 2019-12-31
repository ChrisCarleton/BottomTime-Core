export class EmailTakenError extends Error {
	constructor() {
		super('The selected e-mail is already taken');
		this.name = 'EmailTakenError';
	}
}

export class SsoError extends Error {
	constructor(message, internalError) {
		super(message);
		this.name = 'SsoError';
		this.internalError = internalError;
	}
}
