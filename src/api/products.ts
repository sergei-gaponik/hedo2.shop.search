import { SearchRequestError, SearchResponse } from "../types";
import { isValidStringArray } from '@sergei-gaponik/hedo2.lib.util'
import { esHandler } from '../core/esHandler'

const SEARCH_LIMIT = 100
const COLLECTION_LIMIT = 1000

export async function getProductSearchResults(args): Promise<SearchResponse> {

  let response: SearchResponse = {};

  const _query = args.query || null
  const _filters = args.filters || null
  const _series = args.series || null
  const _brand = args.brand || null

  if((_filters && !_filters.every(a => isValidStringArray(a)))
    || (_series && typeof _series != "string")
    || (_brand && typeof _brand != "string")
    || (_query && typeof _query != "string")){

    response.errors = [ SearchRequestError.badRequest ]
    return response;
  }


  let _limit = _query ? SEARCH_LIMIT : COLLECTION_LIMIT

  if(args.limit)
    _limit = args.limit

  if(isNaN(_limit) ||  _limit > COLLECTION_LIMIT)
    return { errors: [ SearchRequestError.badRequest ] }

  let conditions = !_filters ? [] : _filters.map(category => ({
    bool: {
      should: category.map(filter => ({ term: { properties: filter }})) 
    }
  }))

  if(_series)
    conditions.push({ term: { seriesHandle: _series }})
  if(_brand)
    conditions.push({ term: { brandHandle: _brand }})

  if(_query){
    conditions.push({
      multi_match: {
        query: _query.toLowerCase().trim(),
        fields: [ "brand^3", "series^2", "name^2", "keywords" ],
        fuzziness: "auto"
      }
    })
  }

  let body: any = {
    size: _limit,
    query: conditions.length 
      ? { bool: { must: conditions }} 
      : { match_all: {} },
    _source: false
  }

  if(!args.preview){
    body.fields = [ "properties" ]
  }

  const esProductsResponse: any = await esHandler({ index: 'products', body })

  const products = esProductsResponse.body.hits.hits
  const maxScore = esProductsResponse.body.hits.max_score
  const ids = products.map(a => a._id)

  if(args.preview)
    return { data: { ids, maxScore } }
  
  let hash = {};

  for(const product of products){

    if(!product.fields) continue;
    
    const _properties = product.fields.properties
    for (let i = 0; i < _properties.length; i++) {
      hash[_properties[i]] = true;
    }
  }

  const properties = Object.keys(hash)

  return { data: { ids, properties, maxScore }}
}

export async function getProductsLikeThis(args): Promise<SearchResponse> {

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

  const esProductsResponse: any = await esHandler({
    index: 'products',
    body: {
      size: _limit,
      from: _from,
      query: {
          more_like_this: {
            fields: [ "brand", "series", "keywords" ],
            like: [
              {
                _index: "products",
                _id: _id
              }
            ],
            min_term_freq: 1,
            max_query_terms: 4
          }
      },
      _source: false
    }
  })

  const products = esProductsResponse.body.hits.hits

  response.data = { products }

  return response;
}