import { GraphQLServer } from 'graphql-yoga';
import { Prisma } from 'prisma-binding';
import mongoose from 'mongoose';
import User from './User';
import Todo from './Todo';
import { ObjectId } from 'mongodb';
import crypto from 'crypto';

// connect mongoDB
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://root:root1234@ds229771.mlab.com:29771/mydb', {useNewUrlParser : true});
mongoose.connection.once('open', () => {
    console.log('MongoDB Connected...');
});

// define resolvers
const resolvers = {
  Query: {
    // get User
    user: async(_, {_id}) => {
      return await User.findOne({_id});
    },
    // get Todo
    todos: async (_, {userId}) => {
      return await Todo.find({userId});
    },
  },
  Mutation: {
    // sign up
    signup: async(_, {email, password, nickname}) => {
      const user = new User({
        email,
        password,
        nickname,
        count: 0,
      });

      return user.save();
    },
    // login
    login: async(_, {email, password}) => {
      const tmp = await User.findOne({email});

      if(tmp === null)
      {
        return false;
      }
      
      const salt = tmp.password.salt;
      const iter = tmp.password.iter;
      const hash = crypto.pbkdf2Sync(password, salt, iter, 64, 'sha512').toString('base64');

      const pw = {
        hash,
        salt,
        iter
      };
      
      const user = await User.findOne({email, password: pw});

      if(user !== null)
      {
        return user._id;
      }
      else
      {
        return false;
      }
    },
    // delete user
    deleteUser: async (_, {_id, password}) => {
      const tmp = await User.findOne({_id});

      if(tmp === null)
      {
        return false;
      }

      const salt = tmp.password.salt;
      const iter = tmp.password.iter;
      const hash = crypto.pbkdf2Sync(password, salt, iter, 64, 'sha512').toString('base64');

      const pw = {
        hash,
        salt,
        iter
      };
      
      const user = await User.findOneAndRemove({_id, password: pw});

      if(user !== null)
      {
        await Todo.remove({userId: _id});
        return true;
      }
      else
      {
        return false;
      }
    },
    //change password
    changePassword: async (_, {_id, password, newpassword}) => {
      const tmp = await User.findOne({_id});

      if(tmp === null)
      {
        return false;
      }

      const salt = tmp.password.salt;
      const iter = tmp.password.iter;
      const hash = crypto.pbkdf2Sync(password, salt, iter, 64, 'sha512').toString('base64');

      const pw = {
        hash,
        salt,
        iter
      };
      
      const user = await User.findOneAndUpdate({_id, password: pw}, {password: newpassword});

      if(user !== null)
      {
        return true;
      }
      else
      {
        return false;
      }
    },
    //change nickname
    changeNickname: async (_, {_id, nickname}) => {

      const user = await User.findOneAndUpdate({_id}, {nickname});

      if(user !== null)
      {
        return true;
      }
      else
      {
        return false;
      }
    },
    // check email duplication
    emailCheck: async (_,{email}) => {
      const emailCheck = await User.findOne({email});

      if(emailCheck !== null)
        return true;
      else
        return false;
    },
    // create todo
    createTodo: async(_, {text, userId}) => {
      const todo = new Todo({
        text,
        seen: false,
        userId
      })

      const user = await User.findOne({_id: userId}, function(err, data){
        if(err) throw err;
        data.count += 1;
        data.todos.push(todo);
        data.save();
      });

      return todo.save();
    },
    // delete todo
    deleteTodo: async(_, {_id, userId}) => {
      const todo = await Todo.findOneAndRemove({ _id });

      if(todo !== null)
      {
        await User.findOne({_id: userId}, function(err, data){
          if(err) throw err;
          data.count -= 1;
          data.todos.splice(data.todos.findIndex((todo) => {
            return (todo._id == _id);
          }), 1);
          data.save();
        });
        return true;
      }
      else
        return false;
    },
    // update todo
    updateTodo: async(_, {_id, seen, userId}) => {
      const todo = await Todo.findOneAndUpdate({_id}, {
        seen
      });

      if(todo !== null)
      {
        await User.findOne({_id: userId}, function(err, data){
          if(err) throw err;
          const idx = data.todos.findIndex((todo) => {
            return (todo._id == _id);
          });
          data.todos[idx].seen = seen;
          data.markModified('todos');
          data.save();
        });
        return true;
      }
      else
        return false;
    },
  },
}

const server = new GraphQLServer({
  typeDefs: './src/schema.graphql',
  resolvers,
  context: req => ({
    ...req,
    db: new Prisma({
      typeDefs: 'src/generated/prisma.graphql', // the auto-generated GraphQL schema of the Prisma API
      endpoint: 'https://us1.prisma.sh/public-lieleopard-373/todoappql/dev', // the endpoint of the Prisma API
      debug: true, // log all GraphQL queries & mutations sent to the Prisma API
      // secret: 'mysecret123', // only needed if specified in `database/prisma.yml`
    }),
  }),
})

server.start(() => console.log('Server is running on http://localhost:4000'))
