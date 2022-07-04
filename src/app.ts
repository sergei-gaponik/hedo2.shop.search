require("reflect-metadata")

import { PRODUCTION, VERSION } from './core/const'

if(!PRODUCTION){
  require("dotenv").config()
  // require("module-alias/register")
}

import 'isomorphic-fetch'
import * as Mongoose from 'mongoose'
import fastify from 'fastify'
import * as path from 'path'
import * as fs from 'fs'
import { cyan, bold, yellow, blue} from 'colors/safe'
import { setContext } from './core/context'
import handler from './core/handler'
import systemHandler from './core/systemHandler'
import { initConsole } from '@sergei-gaponik/hedo2.lib.util'
import * as es from '@elastic/elasticsearch'

async function main() {

  initConsole(console)

  console.log(`${bold(blue("SEARCH API"))} v${VERSION}\n`)
  console.log(`env: ${PRODUCTION ? bold(cyan("PRODUCTION")) : bold(yellow("DEVELOPMENT"))}`)
  
  const { PORT, MONGODB_SEARCH, HOST } = process.env
  
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

  setContext({ mongoose, esClient })

  // const app = fastify({
  //   https: {
  //     key: fs.readFileSync(path.join(__dirname, '../.ssl/localhost-key.pem')),
  //     cert: fs.readFileSync(path.join(__dirname, '../.ssl/localhost.pem'))
  //   }
  // })

  const app = fastify()

  app.register(require('fastify-cors'), { origin: "*" })
  app.register(require('fastify-compress'))

  app.post('/api', (req, res) => handler(req, res))
  app.post('/system', (req, res) => systemHandler(req, res));

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`app running on ${cyan(`http://${HOST}:${PORT}`)}`)
    console.log(`api endpoint ${cyan(`http://${HOST}:${PORT}/api`)}`)
    console.log(`system endpoint ${cyan(`http://${HOST}:${PORT}/system`)}\n`)
  })
}

main()