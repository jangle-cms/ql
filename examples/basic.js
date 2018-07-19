const jangle = require('../index')
const Schema = jangle.Schema

jangle
  .start({
    lists: {
      Person: new Schema({
        name: {
          type: String,
          required: true
        },
        email: {
          type: String
        },
        friends: {
          type: [Schema.Types.ObjectId],
          ref: 'Person'
        }
      }),
      BlogPost: new Schema({
        title: {
          type: String,
          required: true
        },
        author: {
          type: Schema.Types.ObjectId,
          ref: 'Person',
          required: true
        }
      })
    }
  })
  .catch(error => console.error(error) || process.exit(1))
