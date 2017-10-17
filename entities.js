import mongoose from 'mongoose';

const { Schema } = mongoose;

const userSchema = new Schema({
	name: String,
	token: String,
	gender: String
});

const companySchema = Schema({
	name: String,
	punchCount: {
		type: Number,
		default: 10
	}
});

const punchSchema = Schema({
	company_id: String,
	user_id: String,
	created: Date,
	used: Boolean
});
module.exports = { userSchema: userSchema, companySchema: companySchema, punchSchema: punchSchema };
