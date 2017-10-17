import express from 'express';
import bodyParser from 'body-parser';
import { userSchema, companySchema, punchSchema } from './entities.js';
import uuidv4 from 'uuid/v4';

const api = db => {
	const User = db.model('User', userSchema);
	const Company = db.model('Company', companySchema);
	const Punch = db.model('Punch', punchSchema);

	var app = express();
	app.use(bodyParser.json());

	var TOKEN = 'Admin';

	// Initialize listen for app to listen on a specific port, either provided or hardcoded
	app.listen(process.env.PORT || 3000, () =>
		console.log('Listening on port 3000')
	);

	//skila auðum lista þegar ekkert er í db
	app.get('/api/companies', (req, res) => {
		Company.find({}).exec((err, data) => {
			if (err) {
				res.statusCode = 500;
				return res.send('Internal server error!');
			}
			const filteredData = data.map(company => ({
				_id: company._id,
				name: company.name,
				punchCount: company.punchCount
			}));
			res.json(filteredData);
		});
	});

	// Gets a specific company, given a valid id
	app.get('/api/companies/:id', (req, res) => {
		const id = req.params.id;
		Company.findOne(
			{ _id: id },
			{ name: 1, punchCount: 1 }
		).exec((err, data) => {
			if (data === null && err == null) {
				res.statusCode = 404;
				return res.send('Company not found!');
			} else if (err) {
				res.statusCode = 500;
				return res.send('Error when finding company!');
			} else {
				res.statusCode = 200;
				return res.send(data);
			}
		});
	});

	// Registers a new company to the punchcard.com service
	app.post('/api/companies', (req, res) => {
		if (req.headers.authorization !== TOKEN) {
			res.statusCode = 401;
			return res.send('Not allowed');
		}
		if (!req.body.hasOwnProperty('name') || req.body.name === '') {
			res.statusCode = 412;
			return res.send('Precondition failed');
		}
		var newCompany = {
			name: req.body.name,
			punchCount: req.body.punchCount
		};
		new Company(newCompany).save(err => {
			if (err) {
				res.statusCode = 412;
				return res.send('Precondition failed');
			} else {
				res.statusCode = 201;
				return res.send({
					id: Company(newCompany)._id
				});
			}
		});
	});

	// Gets all users in the system
	app.get('/api/users', (req, res) => {
		// Get all the users
		User.find({}).exec((err, users) => {
			if (err) {
				res.status(500).json({ error: 'Failed to get users' });
			} else {
				// We only want to return id, name and gender, not the token
				const filteredUsers = users.map(user => ({
					id: user._id,
					name: user.name,
					gender: user.gender
				}));
				return res.json(filteredUsers);
			}
		});
	});

	// Creates a new user in the system
	app.post('/api/users', (req, res) => {
		const { name, gender } = req.body;
		// Authorization and error check
		if (req.headers.authorization !== TOKEN) {
			res.status(401).json();
		} else if (!req.body.hasOwnProperty('name') || !name.length) {
			res.status(412).json({ error: 'User must have a name' });
		} else if (!req.body.hasOwnProperty('gender') || !gender.length) {
			res.status(412).json({ error: 'User must have an gender' });
		} else if (!(gender === 'm' || gender === 'f' || gender === 'o')) {
			res.status(412).json({ error: "Gender must be 'm', 'f' or 'o' " });
		} else {
			// Use uuidv4 to make a token for the user
			var userToken = uuidv4();
			new User({ name, token: userToken, gender }).save((err, user) => {
				if (err) {
					res
						.status(500)
						.json({ error: 'Failed to save to database' });
				} else {
					// Only return the token of the new user to the client
					const { token } = user;
					res.json({ token });
				}
			});
		}
	});

	app.post('/api/my/punches', function (req, res) {
		const token = req.headers.authorization;
		const companyId = req.body.companyId;

		if (!token) {
			res.statusCode = 400;
			return res.send('Bad Request');
		}
		if (!companyId) {
			res.statusCode = 404;
			return res.send('Not Found');
		}
		let _userId;
		let _lastPunch;
		let _punchCount;
		isValidCompany(companyId)
			.then(isValid => {
				if (!isValid) {
					res.statusCode = 404;
					return res.send('Not Found');
				}
				return isValid;
			})
			.then(isValid => {
				return getUserIdByToken(token);
			})
			.then(userId => {
				if (!userId) {
					res.statusCode = 401;
					return res.send('User not found');
				}
				_userId = userId;
				return savePunchToDatabase(companyId, userId);
			})
			.then(punchId => {
				_lastPunch = punchId;
				return getPunchCountByCompanyId(companyId)
			})
			.then(punchCount => {
				if (!punchCount) {
					res.statusCode = 404;
					return res.send('punchCount not found')
				}
				_punchCount = punchCount;
				return getTotalUnusedPunches(companyId, _userId);
			})
			.then(totalUnusedPunches => {
				if (!totalUnusedPunches) {
					res.statusCode = 404;
					return res.send('punchCount not found')
				}
				if (totalUnusedPunches === _punchCount) {
					return Punch.update({ company_id: companyId, user_id: _userId, used: false }, { used: true }, { multi: true }, () => {
						return res.status(200).json({ Discount: true });
					});
				} else {
					return res.status(200).json({ id: _lastPunch });
				}
			})
			.catch(err => {
				res.statusCode = 500;
				return res.send(err);
			});
	});

	// Helper functions
	function getUserIdByToken(token) {
		return User.findOne(
			{ token: token }, '_id'
		).then(data => {
			if (data) {
				return data._id;
			} else {
				return null;
			}
		});
	};

	function isValidCompany(companyId) {
		return Company.findOne(
			{ _id: companyId }, '_id'
		).then(data => {
			if (data) {
				return true;
			} else {
				return false;
			}
		});
	};

	function getPunchCountByCompanyId(companyId) {
		return Company.findOne(
			{ _id: companyId }, 'punchCount'
		).then(data => {
			if (data) {
				return data.punchCount;
			} else {
				return null;
			}
		});
	};

	function getTotalUnusedPunches(companyId, userId) {
		return Punch.count(
			{ company_id: companyId, user_id: userId, used: false }
		).then(number => {
			if (number) {
				return number;
			} else {
				return null;
			}
		});
	};

	function savePunchToDatabase(companyId, userId) {
		const newPunch = new Punch({ company_id: companyId, user_id: userId, created: new Date(), used: false });
		return newPunch.save().then(punch => {
			return punch._id;
		});
	}
}
module.exports = { api };
