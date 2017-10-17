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

const punchesSchema = Schema({
	company_id: Number,
	user_id: Number,
	created: Date,
	used: Boolean
});
module.exports = { userSchema: userSchema, companySchema: companySchema };
