import { SearchRequestError, SearchResponse } from "../types";
import { context } from '../core/context'

async function getProductSearchResults(args): Promise<SearchResponse> {

  let response: SearchResponse = {};

  const _query = args.query || null

  if(!_query){
    response.errors = [ SearchRequestError.missingArgs ]
    return response;
  }

  if(typeof _query !== "string"){
    response.errors = [ SearchRequestError.badRequest ]
    return response;
  }

  const _limit = parseInt(args.limit || 25)

  const _from = (parseInt(args.page || 1) - 1) * _limit

  if(isNaN(_limit) || isNaN(_from) || _limit > 100){
    response.errors = [ SearchRequestError.badRequest ]
    return response;
  }

  let body: any = {
    size: _limit,
    from: _from,
    query: {
      bool: {
        should: [
          {
            match_phrase_prefix: {
              title: {
                query: _query,
                slop: 2
              }
            }
          },
          {
            match: {
              keywords: {
                fuzziness: "auto",
                query: _query
              }
            }
          }
        ]
      }
    },
    _source: false
  }

  if(!args.preview){
    body.fields = [ "properties" ]
  }

  const esProductsResponse: any = await context().esClient.search({
    index: 'products', 
    body
  })

  const products = esProductsResponse.body.hits.hits

  response.data = { products }

  return response;
}

async function getProductsLikeThis(args): Promise<SearchResponse> {

  let response: SearchResponse = {};

  const _id = args._id || null

  if(!_id){
    response.errors = [ SearchRequestError.missingArgs ]
    return response;
  }

  if(typeof _id !== "string"){
    response.errors = [ SearchRequestError.badRequest ]
    return response;
  }

  const _limit = parseInt(args.limit || 25)

  const _from = (parseInt(args.page || 1) - 1) * _limit

  if(isNaN(_limit) || isNaN(_from)){
    response.errors = [ SearchRequestError.badRequest ]
    return response;
  }

  const esProductsResponse: any = await context().esClient.search({
    index: 'products',
    body: {
      size: _limit,
      from: _from,
      query: {
          more_like_this: {
            fields: [
              "title",
              "keywords"
            ],
            like: [
              {
                _index: "products",
                _id: _id
              }
            ],
            min_term_freq: 1,
            max_query_terms: 12
          }
      },
      _source: false
    }
  })

  const products = esProductsResponse.body.hits.hits

  response.data = { products }

  return response;
}

export {
  getProductSearchResults,
  getProductsLikeThis
}