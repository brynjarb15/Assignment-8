import express from 'express';
import bodyParser from 'body-parser';
import { userSchema, companySchema } from './entities.js';
import uuidv4 from 'uuid/v4';

const api = db => {
	const User = db.model('User', userSchema);
	const Company = db.model('Company', companySchema);
	/*new Company({ name: 'Brynjar', punchCount: 5 }).save((err, company) => {
		if (err) {
			console.log('ERROR');
		} else {
			console.log(company);
		}
	});*/
	var app = express();
	app.use(bodyParser.json());

	var TOKEN = 'Admin';

	// Defining data structures for companies and users in punchcard.com
	var companies = [];
	var users = [];
	var punches = new Map();

	// Initialize listen for app to listen on a specific port, either provided or hardcoded
	app.listen(process.env.PORT || 3000, () =>
		console.log('Listening on port 3000')
	);

	// Returns all companies, registered in the punchcard.com service
	app.get('/api/companies', function(req, res) {
		return res.json(companies);
	});

	// Registers a new company to the punchcard.com service
	app.post('/api/companies', function(req, res) {
		if (
			!req.body.hasOwnProperty('name') ||
			!req.body.hasOwnProperty('punchCount')
		) {
			res.statusCode = 400;
			return res.send('Post syntax error');
		}
		var newCompany = {
			id: companies.length + 1,
			name: req.body.name,
			punchCount: req.body.punchCount
		};

		companies.push(newCompany);

		res.json(true);
	});

	// Gets a specific company, given a valid id
	app.get('/api/companies/:id', function(req, res) {
		var company;
		for (var i = 0; i < companies.length; i++) {
			if (companies[i].id == req.params.id) {
				company = companies[i];
				break;
			}
		}
		if (company) {
			return res.json(company);
		} else {
			res.statusCode = 404;
			return res.send('Company with given id was not found');
		}
	});

	// Gets all users in the system
	app.get('/api/users', function(req, res) {
		return res.json(users);
	});

	// Creates a new user in the system
	app.post('/api/users', function(req, res) {
		console.log('jejeje');
		const { name, gender } = req.body;
		if (req.headers.authorization !== TOKEN) {
			res.status(401).json();
		} else if (!req.body.hasOwnProperty('name') || !name.length) {
			res.status(412).json({ error: 'User must have a name' });
		} else if (!req.body.hasOwnProperty('gender') || !gender.length) {
			res.status(412).json({ error: 'User must have an gender' });
		} else if (!(gender === 'm' || gender === 'f' || gender === 'o')) {
			res.status(412).json({ error: "Gender must be 'm', 'f' or 'o' " });
		} else {
			var userToken = uuidv4();
			new User({ name, token: userToken, gender }).save((err, user) => {
				if (err) {
					res
						.status(500)
						.json({ error: 'Failed to save to database' }); // should this be the only error here?
				} else {
					const { _id, name, gender, token } = user;
					res.json({ id: _id, name, gender, token });
				}
			});
		}
	});

	// Returns a list of all punches, registered for the given user
	app.get('/api/users/:id/punches', function(req, res) {
		if (!isValidUser(req.params.id)) {
			res.statusCode = 404;
			return res.send('User with given id was not found in the system.');
		}
		// There was a ?company query provided
		if (req.query.company) {
			var filteredPunches = punches.get(req.params.id);
			if (filteredPunches) {
				// The user already has some punches in his list
				var returnList = [];
				filteredPunches.forEach(function(value, idx) {
					if (value.companyId == req.query.company) {
						returnList.push(value);
					}
				});
				return res.json(returnList);
			} else {
				return res.json([]);
			}
		} else {
			var retrievedPunches =
				punches.get(req.params.id) === undefined
					? []
					: punches.get(req.params.id);
			return res.json(retrievedPunches);
		}
	});

	// Creates a punch, associated with a user
	app.post('/api/users/:id/punches', function(req, res) {
		if (!req.body.hasOwnProperty('companyId')) {
			res.statusCode = 400;
			return res.send('Company Id is missing');
		} else if (!isValidUser(req.params.id)) {
			res.statusCode = 404;
			return res.send('The user was not found in the system.');
		} else if (!isValidCompany(req.body.companyId)) {
			res.statusCode = 404;
			return res.send(
				'The company with the given id was not found in the system.'
			);
		}

		// We have valid data
		var oldPunches =
			punches.get(req.params.id) === undefined
				? []
				: punches.get(req.params.id);
		oldPunches.push({
			companyId: req.body.companyId,
			companyName: getCompanyNameById(req.body.companyId),
			created: new Date().toLocaleString()
		});
		punches.set(req.params.id, oldPunches);

		res.json(true);
	});

	// Helper functions

	function isValidUser(userId) {
		for (var i = 0; i < users.length; i++) {
			if (users[i].id == userId) {
				return true;
			}
		}
		return false;
	}

	function isValidCompany(companyId) {
		for (var i = 0; i < companies.length; i++) {
			if (companies[i].id == companyId) {
				return true;
			}
		}
		return false;
	}

	function getCompanyNameById(companyId) {
		for (var i = 0; i < companies.length; i++) {
			if (companies[i].id == companyId) {
				return companies[i].name;
			}
		}
		return '';
	}
};
module.exports = { api };
