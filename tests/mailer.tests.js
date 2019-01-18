import { expect } from 'chai';
import faker from 'faker';
import mailer from '../service/mail/mailer';

describe('Mailer', () => {
	it('Can successfully send messages', async () => {
		const info = await mailer.sendMail({
			from: 'info@bottomtime.ca',
			to: faker.internet.email(),
			subject: 'Test E-mail!!',
			html: '<p>Yo!</p>'
		});

		expect(info.accepted).to.be.an('Array');
		expect(info.accepted).to.have.length(1);
	});

	it('Rejects if message is not sent', () => {
		expect(
			async () => await mailer.sendMail({
				subject: 'Ha! No "to" line! Good luck!',
				html: '<p>Yo!</p>'
			})
		).to.throw;
	});
});
