const jangle = require('../core')
const express = require('express')
const graphql = require('express-graphql')
const { buildSchema } = require('graphql')

// Converting lists to a GraphQL String
const map = (fn) => (list) => list.map(fn)
const debug = (thing) => console.log(thing) || thing
const join = (separator) => (list) => list.join(separator)
const prepend = (prefix) => (string) => prefix + string

const toGraphQLField = ({ name, type, required }) =>
  `${name}: ${type}${required ? '!' : ''}`

const toGraphQLType = ({ name, schema: { fields } }) =>
  `type ${name} {
  ${fields.map(toGraphQLField).join('\n  ')}
}`

const getListSchemas = (lists) =>
  Promise.all(
    Object.keys(lists).map(name =>
      lists[name].schema().then(schema => ({ name, schema }))
    )
  )

const toGraphQLQueryField = ({ name }) =>
  `${name.toLowerCase()}: ${name}`

const queryRoot = (schemas) => `type Query {
  ${schemas.map(toGraphQLQueryField).join('\n  ')}
}`

const toGraphQLSchema = (schemas) =>
  Promise.resolve(schemas)
    .then(map(toGraphQLType))
    .then(join('\n\n'))
    .then(prepend(queryRoot(schemas) + '\n\n'))
    .then(debug)

// GraphQL Stuff

const init = ({ port } = {}) => ({ lists }) =>
  getListSchemas(lists)
    .then(toGraphQLSchema)
    .then(schema => {
      const app = express()

      app.use('/ql', graphql({
        schema: buildSchema(schema),
        graphiql: true
      }))

      app.listen(port || 3000, () =>
        `Ready at http://localhost:${port || 3000}`
      )
      return app
    })
    .catch(console.error)

module.exports = {
  start: (config) => jangle.start(config).then(init(config.ql)),
  Schema: jangle.Schema
}
