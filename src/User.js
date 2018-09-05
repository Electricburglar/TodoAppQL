import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const userSchema = new Schema({
  email: String,
  password: mongoose.Schema.Types.Mixed,
  nickname: String,
  count: {
    type: Number,
    default: 0
  },
  todos: [mongoose.Schema.Types.Mixed]
});

export default mongoose.model('User', userSchema);