const jangle = require('../core')
const express = require('express')
const graphql = require('express-graphql')
const pluralize = require('pluralize')
const { buildSchema } = require('graphql')

// Utilities
const map = (fn) => (list) => list.map(fn)
const camelcase = (string) => string[0].toLowerCase() + string.substring(1)
const debug = (thing) => console.log(thing) || thing
const join = (separator) => (list) => list.join(separator)
const prepend = (prefix) => (string) => prefix + string
const endsIn = (word, piece) => word.lastIndexOf(piece) === word.length - piece.length
const isArrayType = (type) => endsIn(type, '[]')

// Jangle Schemas
const getListSchemas = (lists) =>
  Promise.all(
    Object.keys(lists).map(name =>
      lists[name].schema().then(schema => ({ name, schema }))
    )
  )

// Converting Jangle Schemas to GraphQL Schemas
const mongooseToGraphQLTypeMap = {
  'Number': 'Float',
  'ObjectID': 'ID'
}

const toGraphQLType = (type) =>
  isArrayType(type)
    ? `[${toGraphQLType(type.substring(0, type.length - 2))}]`
    : mongooseToGraphQLTypeMap[type] || type

const toGraphQLField = (field) =>
  `${field.name}: ${toGraphQLType(field.type)}`

const toGraphQLSchemaType = ({ name, schema: { fields } }) =>
  `type ${name} {
  ${fields.map(toGraphQLField).join('\n  ')}
}`

const toGraphQLQueryField = ({ name }) =>
  `${camelcase(name)}(id: ID!): ${name}
  ${camelcase(pluralize(name))}: [${name}]`

const queryRoot = (schemas) => `type Query {
  ${schemas.map(toGraphQLQueryField).join('\n  ')}
}`

const toGraphQLSchema = (schemas) =>
  Promise.resolve(schemas)
    .then(map(toGraphQLSchemaType))
    .then(join('\n\n'))
    .then(prepend(queryRoot(schemas) + '\n\n'))
    .then(debug)

// GraphQL App
const startApp = ({ port }) => (schema) => {
  const app = express()

  app.use('/ql', graphql({
    schema: buildSchema(schema),
    graphiql: true
  }))

  app.listen(port || 3000, () =>
    console.info(`Ready at http://localhost:${port || 3000}/ql`)
  )
  return app
}

// Main Method
const init = ({ port } = {}) => ({ lists }) =>
  getListSchemas(lists)
    .then(toGraphQLSchema)
    .then(startApp({ port }))
    .catch(console.error)

module.exports = {
  start: (config) => jangle.start(config).then(init(config.ql)),
  Schema: jangle.Schema
}
