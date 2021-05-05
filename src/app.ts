require("module-alias/register")
require("reflect-metadata")
require("dotenv").config()

import * as Mongoose from 'mongoose'
import * as express from 'express'
import * as path from 'path'
import * as https from 'https'
import * as urql from "@urql/core"
import * as fs from 'fs'
import { cyan, bold, yellow, blue} from 'colors/safe'
import { setContext } from './core/context'
import handler from './core/handler'
import { PRODUCTION, VERSION } from './core/const'

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

  console.log("initializing graphql...")

  const urqlClient = urql.createClient({ url: SYSTEM_API_ENDPOINT })

  setContext({ mongoose, urqlClient })

  const app = express()

  app.use(express.json())
  app.post('/api', (req, res) => handler(req, res))

  const sslApp = https.createServer({
    key: fs.readFileSync(path.join(__dirname, '../.ssl/localhost-key.pem')),
    cert: fs.readFileSync(path.join(__dirname, '../.ssl/localhost.pem'))
  }, app)

  sslApp.listen(PORT, () => {
    console.log(`\napp running on ${cyan(`https://${HOST}:${PORT}`)}`)
    console.log(`api endpoint ${cyan(`https://${HOST}:${PORT}/api`)}`)
  })
}

main()