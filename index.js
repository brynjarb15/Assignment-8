/*
	In order for this to successfully run, there are 3 steps that need to be taken
	  1. npm install
	  2. yarn start

	After that the server runs on http://localhost:3000
*/

import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import api from './api.js';

console.log('inni index');

mongoose.Promise = global.Promise;
mongoose
	.connect(
		'mongodb://verkefni-8:verkefni-8@ds121575.mlab.com:21575/verkefni-8',
		{
			useMongoClient: true
		}
	)
	.then(db => {
		api.api(db);
	});
