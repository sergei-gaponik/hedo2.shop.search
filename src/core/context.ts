import * as urql from "@urql/core"
import { Client } from '@elastic/elasticsearch'
import { Mongoose } from "mongoose"

export interface Context {
  urqlClient?: urql.Client,
  mongoose?: Mongoose,
  esClient?: Client
}

let _context = {}


export const setContext = (context: Context) => {
  _context = Object.assign(_context, context)
}
export const context = (): Context => _context