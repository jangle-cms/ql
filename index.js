const jangle = require('@jangle/core')
const express = require('express')
const graphql = require('express-graphql')
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
    Object.values(lists).map(list => list.schema())
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

const toGraphQLSchemaType = ({ name, fields }) =>
  `type ${name} {
  ${fields.map(toGraphQLField).join('\n  ')}
}`

const toGraphQLQueryField = ({ name, labels }) =>
  `${camelcase(labels.singular)}(id: ID!): ${name}
  ${camelcase(labels.plural)}: [${name}]`

const queryRoot = (schemas) => `type Query {
  ${schemas.map(toGraphQLQueryField).join('\n  ')}
}`

const toGraphQLSchema = (schemas) =>
  Promise.resolve(schemas)
    .then(map(toGraphQLSchemaType))
    .then(join('\n\n'))
    .then(prepend(queryRoot(schemas) + '\n\n'))
    .then(debug)

const buildResolvers = ({ lists }, schemas) => {
  console.log(
    schemas.map(schema => schema.fields)
  )
  return {
    person (id) {
      return null
    },
    people () {
      return []
    },
    blogPost () {
      return null
    },
    blogPosts () {
      return []
    }
  }
}

// GraphQL App
const startApp = ({ jangle, port }) => ({ schemas, schema }) => {
  const app = express()

  app.use('/ql', graphql({
    schema: buildSchema(schema),
    rootValue: buildResolvers(jangle, schemas),
    graphiql: true
  }))

  app.listen(port || 3000, () =>
    console.info(`Ready at http://localhost:${port || 3000}/ql`)
  )

  return app
}

// Main Method
const init = ({ port } = {}) => (jangle) =>
  getListSchemas(jangle.lists)
    .then(schemas =>
      toGraphQLSchema(schemas)
        .then(schema => ({ schema, schemas }))
    )
    .then(startApp({ jangle, port }))
    .catch(console.error)

module.exports = {
  start: (config) => jangle.start(config).then(init(config.ql)),
  Schema: jangle.Schema
}
