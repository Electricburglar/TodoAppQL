import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const todoSchema = new Schema({
  text: String,
  seen: Boolean,
  userId: String,
});

export default mongoose.model('Todo', todoSchema);
