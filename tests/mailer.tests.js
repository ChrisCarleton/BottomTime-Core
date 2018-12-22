import { expect } from 'chai';
import faker from 'faker';
import mailer from '../service/mail/mailer';

describe('Mailer', () => {
	it('Can successfully send messages', done => {
		mailer
			.sendMail({
				from: 'info@bottomtime.ca',
				to: faker.internet.email(),
				subject: 'Test E-mail!!',
				html: '<p>Yo!</p>'
			})
			.then(info => {
				expect(info.accepted).to.be.an('Array');
				expect(info.accepted).to.have.length(1);
				done();
			})
			.catch(done);
	});

	it('Rejects if message is not sent', done => {
		mailer
			.sendMail({
				subject: 'Ha! No "to" line! Good luck!',
				html: '<p>Yo!</p>'
			})
			.then(() => done('Should not have succeeded.'))
			.catch(() => {
				done();
			});
	});

});
