import { SearchRequestError, SearchResponse } from "../types";
import { isValidStringArray } from '@sergei-gaponik/hedo2.lib.util'
import { esHandler } from '../core/esHandler'

const SEARCH_LIMIT = 10

export async function getArticleSearchResults(args): Promise<SearchResponse> {

  const _query = args.query || null

  if(!_query || typeof _query != "string")
    return { errors: [ SearchRequestError.badRequest ] }

  const _limit = args.limit || SEARCH_LIMIT

  if(isNaN(_limit) ||  _limit > SEARCH_LIMIT)
    return { errors: [ SearchRequestError.badRequest ] }

  let body: any = {
    size: _limit,
    query: { 
      multi_match: {
        query: _query,
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

  let response: SearchResponse = {};

  const _id = args._id || null
  let exclude = args.exclude || null

  if(!_id || !exclude){
    response.errors = [ SearchRequestError.missingArgs ]
    return response;
  }

  if(typeof _id !== "string" || !Array.isArray(exclude) || exclude.some(a => typeof(a) != "string")){
    response.errors = [ SearchRequestError.badRequest ]
    return response;
  }

  const _limit = parseInt(args.limit || 25)
  const _from = (parseInt(args.page || 1) - 1) * _limit

  if(isNaN(_limit) || isNaN(_from)){
    response.errors = [ SearchRequestError.badRequest ]
    return response;
  }

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

  console.log(articles)

  response.data = { articles }

  return response;
}