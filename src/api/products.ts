import { SearchRequestError, SearchResponse } from "../types";
import { isValidStringArray } from '@sergei-gaponik/hedo2.lib.util'
import { esHandler } from '../core/esHandler'
import Joi = require("joi");

const SEARCH_LIMIT = 100
const COLLECTION_LIMIT = 500
const MAX_PRICE = 999

export async function getProductSearchResults(args): Promise<SearchResponse> {

  const schema = Joi.object({
    query: Joi.string().allow(null),
    filters: Joi.array().items(Joi.array().items(Joi.string())).allow(null),
    series: Joi.string().allow(null),
    brand: Joi.string().allow(null),
    priceRange: Joi.array().allow(null).items(Joi.number().min(0).max(MAX_PRICE)).min(2).max(2).sort({ order: "ascending" }),
    limit: Joi.number().allow(null).integer().min(0).max(COLLECTION_LIMIT),
    minDiscount: Joi.number().allow(null).min(0).max(1),
    preview: Joi.bool().allow(null)
  })

  try{
    await schema.validateAsync(args)
  }
  catch(e){
    console.log(e)
    return { errors: [ SearchRequestError.badRequest ] }
  }

  let _limit = args.query ? SEARCH_LIMIT : COLLECTION_LIMIT

  if(args.limit)
    _limit = args.limit

  if(isNaN(_limit) ||  _limit > COLLECTION_LIMIT)
    return { errors: [ SearchRequestError.badRequest ] }

  let conditions = !args.filters ? [] : args.filters.map(category => ({
    bool: {
      should: category.map(filter => ({ term: { properties: filter }})) 
    }
  }))

  if(args.series){
    conditions.push({ term: { seriesHandle: args.series }})
  }
  if(args.brand && !args.series){
    conditions.push({ term: { brandHandle: args.brand }})
  }
  if(args.priceRange){
    conditions.push({ 
      range: { 
        price: { 
          gte: args.priceRange[0] - 1, 
          lte: args.priceRange[1] + 1
        } 
      }
    })
  }
  if(args.minDiscount){
    conditions.push({
      range: {
        discount: {
          gte: args.minDiscount
        }
      }
    })
  }

  if(args.query){
    conditions.push({
      multi_match: {
        query: args.query.toLowerCase().trim(),
        fields: [ "brand^3", "series^2", "name^2", "keywords", "eans" ],
        fuzziness: "auto"
      }
    })
  }

  let body: any = {
    size: parseInt(_limit as any),
    query: conditions.length 
      ? { bool: { must: conditions }} 
      : { match_all: {} },
    _source: false
  }

  if(!args.preview){
    body.fields = [ "properties", "price" ]
  }


  const esProductsResponse: any = await esHandler({ index: 'products', body })
  
  const products = esProductsResponse.body.hits.hits
  const maxScore = esProductsResponse.body.hits.max_score
  const ids = products.map(a => a._id)

  if(args.preview)
    return { data: { ids, maxScore } }
  
  let hash = {};

  let minPrice = MAX_PRICE;
  let maxPrice = 0;

  for(const product of products){

    if(!product.fields) continue;

    minPrice = Math.min(...[ minPrice, ...product.fields?.price ])
    maxPrice = Math.max(...[ maxPrice, ...product.fields?.price ])

    const _properties = product.fields?.properties
    for (let i = 0; i < _properties?.length; i++) {
      hash[_properties[i]] = true;
    }
  }

  const properties = Object.keys(hash)

  return { 
    data: { 
      ids, 
      properties, 
      maxScore, 
      priceRange: ids?.length ? [ minPrice, maxPrice ] : null
    }
  }
}

export async function getProductsLikeThis(args): Promise<SearchResponse> {

  const schema = Joi.object({
    _id: Joi.string().required(),
    limit: Joi.number().allow(null).integer().min(0).max(SEARCH_LIMIT)
  })

  try{
    await schema.validateAsync(args)
  }
  catch(e){
    console.log(e)
    return { errors: [ SearchRequestError.badRequest ] }
  }

  const esProductsResponse: any = await esHandler({
    index: 'products',
    body: {
      size: args.limit || SEARCH_LIMIT,
      query: {
          more_like_this: {
            fields: [ "brand", "series", "keywords" ],
            like: [
              {
                _index: "products",
                _id: args._id
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

  return { data: { products }}
}