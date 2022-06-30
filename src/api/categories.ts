import { SearchRequestError, SearchResponse } from "../types";
import { isValidStringArray } from '@sergei-gaponik/hedo2.lib.util'
import { esHandler } from '../core/esHandler'
import Joi = require("joi");

const SEARCH_LIMIT = 10

export async function getCategorySearchResults(args): Promise<SearchResponse> {

  const schema = Joi.object({
    query: Joi.string().required(),
    limit: Joi.number().allow(null).integer().min(0).max(SEARCH_LIMIT)
  })

  try{
    await schema.validateAsync(args)
  }
  catch(e){
    console.log(e)
    return { errors: [ SearchRequestError.badRequest ] }
  }

  let body: any = {
    size: args.limit || SEARCH_LIMIT,
    query: { 
      multi_match: {
        query: args.query,
        fields: [ "name", "title", "keywords" ],
        fuzziness: "auto"
      } 
    }
  }

  const r: any = await esHandler({ index: 'categories', body })

  const categories = r.body.hits.hits.map(a => ({
    _id: a._id,
    name: a._source.name,
    handle: a._source.handle
  }))
  const maxScore = r.body.hits.max_score
  
  return { data: { categories, maxScore } }
}