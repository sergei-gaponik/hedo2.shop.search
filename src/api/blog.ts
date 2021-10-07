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
        fields: [ "name^8", "tags^5", "body" ],
        fuzziness: "auto"
      } 
    },
    min_score: 0.25
  }

  const r: any = await esHandler({ index: 'articles', body })

  const articles = r.body.hits.hits.map(a => ({
    _id: a._id,
    name: a._source.name,
    handle: a._source.handle
  }))
  const maxScore = r.body.hits.max_score
  
  return { data: { articles, maxScore } }
}