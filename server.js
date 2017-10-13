/*
    In order for this to successfully run, there are 3 steps that need to be taken
      1. npm install
      2. npm run babel
      3. npm start

    You can also do this in 2 steps, if you are in a big big hurry
      1. npm install
      2. npm run execute

    After that the server runs on http://localhost:5001
*/

import express from 'express';
import bodyParser from 'body-parser';

var app = express();
app.use(bodyParser.json());

// Defining data structures for companies and users in punchcard.com
var companies = [];
var users = [];
var punches = new Map();

// Initialize listen for app to listen on a specific port, either provided or hardcoded
app.listen(process.env.PORT || 5001);

// Returns all companies, registered in the punchcard.com service
app.get('/api/companies', function (req, res) {
    return res.json(companies);
});

// Registers a new company to the punchcard.com service
app.post('/api/companies', function (req, res) {
    if (!req.body.hasOwnProperty('name') || !req.body.hasOwnProperty('punchCount')) {
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
app.get('/api/companies/:id', function (req, res) {
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
app.get('/api/users', function (req, res) {
    return res.json(users);
});

// Creates a new user in the system
app.post('/api/users', function (req, res) {
    if (!req.body.hasOwnProperty('name') || !req.body.hasOwnProperty('email')) {
        res.statusCode = 400;
        return res.send('User was not properly formatted');
    }
    var newUser = {
        id: users.length + 1,
        name: req.body.name,
        email: req.body.email 
    }
    users.push(newUser);

    res.json(true);
});

// Returns a list of all punches, registered for the given user
app.get('/api/users/:id/punches', function (req, res) {
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
            filteredPunches.forEach(function (value, idx) {
                if (value.companyId == req.query.company) {
                    returnList.push(value);
                }
            });
            return res.json(returnList);
        } else {
            return res.json([]);
        }
    } else {
        var retrievedPunches = punches.get(req.params.id) === undefined ? [] : punches.get(req.params.id);
        return res.json(retrievedPunches);
    }
});

// Creates a punch, associated with a user
app.post('/api/users/:id/punches', function (req, res) {
    if (!req.body.hasOwnProperty('companyId')) {
        res.statusCode = 400;
        return res.send('Company Id is missing');
    } else if (!isValidUser(req.params.id)) {
        res.statusCode = 404;
        return res.send('The user was not found in the system.');
    } else if (!isValidCompany(req.body.companyId)) {
        res.statusCode = 404;
        return res.send('The company with the given id was not found in the system.');
    }

    // We have valid data
    var oldPunches = punches.get(req.params.id) === undefined ? [] : punches.get(req.params.id);
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
    return "";
}