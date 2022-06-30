import { SearchRequestError, SearchResponse } from "../types";
import { isValidStringArray } from '@sergei-gaponik/hedo2.lib.util'
import { esHandler } from '../core/esHandler'
import Joi = require("joi");

const SEARCH_LIMIT = 10

export async function getArticleSearchResults(args): Promise<SearchResponse> {

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
        fields: [ "name^2", "tags", "body^0.5", "author" ],
        fuzziness: "auto"
      }
    },
    min_score: 0.6,
    _source: ["imageSrc", "name", "handle", "published", "author"]
  }

  const r: any = await esHandler({ index: 'articles', body })

  const articles = r.body.hits.hits.map(a => ({
    _id: a._id,
    published: a._source.published,
    name: a._source.name,
    handle: a._source.handle,
    imageSrc: a._source.imageSrc,
    author: a._source.author
  }))
  const maxScore = r.body.hits.max_score
  
  return { data: { articles, maxScore } }
}


export async function getInterestingArticles(args): Promise<SearchResponse> {

  const schema = Joi.object({
    _id: Joi.string().required(),
    exclude: Joi.array().items(Joi.string()).required(),
    limit: Joi.number().integer().min(1).max(SEARCH_LIMIT),
    page: Joi.number().integer().min(1)
  })

  try{
    await schema.validateAsync(args)
  }
  catch(e){
    console.log(e)
    return { errors: [ SearchRequestError.badRequest ] }
  }

  let response: SearchResponse = {};

  const _id = args._id
  let exclude = args.exclude

  const _limit = parseInt(args.limit || 25)
  const _from = (parseInt(args.page || 1) - 1) * _limit

  exclude.push(_id)

  const r: any = await esHandler({
    index: 'articles',
    body: {
      size: _limit,
      from: _from,
      query: {
        bool: {
          should: [
            {
              more_like_this: {
                fields: [ "tags", "name" ],
                like: [
                  {
                    _index: "articles",
                    _id: _id
                  }
                ],
                min_term_freq: 1,
                min_doc_freq: 1
              }
            },
            {
              match_all: {
                boost: 0.3
              }
            }
          ],
          must_not: 
            [ ... new Set(exclude)].map(_id => ({ 
              match: { _id: _id } 
            }))
        }
      },
      _source: ["imageSrc", "name", "handle", "published", "author"]
    }
  })

  const articles = r.body.hits.hits.map(a => ({
    _id: a._id,
    published: a._source.published,
    name: a._source.name,
    handle: a._source.handle,
    imageSrc: a._source.imageSrc,
    author: a._source.author,
    score: a._score
  }))

  response.data = { articles }

  return response;
}