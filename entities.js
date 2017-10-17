import mongoose from 'mongoose';

const { Schema } = mongoose;

const userSchema = new Schema({
	name: String,
	token: String,
	gender: String
});

const companySchema = Schema({
	name: String,
	punchCount: Number
});

module.exports = { userSchema: userSchema, companySchema: companySchema };
