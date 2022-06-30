import { SearchRequestError, SearchResponse } from "../types";
import { isValidStringArray } from '@sergei-gaponik/hedo2.lib.util'
import { esHandler } from '../core/esHandler'
import Joi = require("joi");

const SEARCH_LIMIT = 10

export async function getBrandSearchResults(args): Promise<SearchResponse> {

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
      match: {
        name: {
          query: args.query,
          fuzziness: "auto"
        }
      } 
    }
  }

  const r: any = await esHandler({ index: 'brands', body })

  const brands = r.body.hits.hits.map(a => ({
    _id: a._id,
    name: a._source.name,
    handle: a._source.handle
  }))
  const maxScore = r.body.hits.max_score
  
  return { data: { brands, maxScore } }
}

export async function getSeriesSearchResults(args): Promise<SearchResponse> {

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
        fields: [ "name^2", "brand" ],
        fuzziness: "auto"
      } 
    }
  }

  const r: any = await esHandler({ index: 'series', body })

  const maxScore = r.body.hits.max_score

  const series = r.body.hits.hits.map(a => ({
    _id: a._id,
    name: a._source.name,
    handle: a._source.handle
  }))
  
  return { data: { series, maxScore } }
}