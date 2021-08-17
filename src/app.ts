require("module-alias/register")
require("reflect-metadata")
require("dotenv").config()

import 'isomorphic-fetch'
import * as Mongoose from 'mongoose'
import fastify from 'fastify'
import * as path from 'path'
import * as urql from "@urql/core"
import * as fs from 'fs'
import { cyan, bold, yellow, blue} from 'colors/safe'
import { setContext } from './core/context'
import handler from './core/handler'
import { PRODUCTION, VERSION } from './core/const'
import { setLoggerContext } from '@sergei-gaponik/hedo2.lib.util'
import scheduler from './core/scheduler'
import * as es from '@elastic/elasticsearch'

async function main() {

  console.log(`${bold(blue("SEARCH API"))} v${VERSION}\n`)
  console.log(`env: ${PRODUCTION ? bold(cyan("PRODUCTION")) : bold(yellow("DEVELOPMENT"))}`)
  
  const { PORT, SYSTEM_API_ENDPOINT, MONGODB_SEARCH, HOST } = process.env
  
  console.log("connecting to mongodb...")

  const mongooseOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    autoIndex: false
  }
  
  const mongoose = await Mongoose.connect(MONGODB_SEARCH, mongooseOptions)

  if(!PRODUCTION && process.argv.includes("mdebug")) 
    Mongoose.set('debug', true);

  console.log("connecting to elastic search...")

  const esClient = new es.Client({
    node: process.env.ES_ENDPOINT,
    auth: { 
      username: process.env.ES_USER, 
      password: process.env.ES_PASSWORD 
    }
  })

  const esResponse = await esClient.info()

  if(esResponse.statusCode != 200 || process.argv.includes("esstatus"))
    console.log(esResponse)

  if(esResponse.statusCode != 200)
    throw new Error();

  console.log("initializing graphql...")

  const urqlClient = urql.createClient({ url: SYSTEM_API_ENDPOINT })

  setContext({ mongoose, urqlClient, esClient })
  setLoggerContext(process.env.LOGGER_ENDPOINT, process.env.LOGGER_SECRET, "shop_search")

  scheduler()

  const app = fastify({
    https: {
      key: fs.readFileSync(path.join(__dirname, '../.ssl/localhost-key.pem')),
      cert: fs.readFileSync(path.join(__dirname, '../.ssl/localhost.pem'))
    }
  })

  app.register(require('fastify-cors'), { origin: "*" })

  app.post('/api', (req, reply) => handler(req, reply))

  app.listen(PORT, () => {
    console.log(`\napp running on ${cyan(`https://${HOST}:${PORT}`)}`)
    console.log(`api endpoint ${cyan(`https://${HOST}:${PORT}/api`)}\n`)
  })
}

main()