import { SearchRequestError, SearchResponse } from "../types";
import { context } from '../core/context'
import { queryAll } from '@sergei-gaponik/hedo2.lib.util'
import { clearCache } from '../core/esHandler'
import esIndex from '../core/esIndex'

export async function indexBrands(args): Promise<SearchResponse> {

  const gql = `
    query GetBrandsForIndexing($limit: Float!, $page: Float!){
      brands(limit: $limit, page: $page) {
        _id
        name
        handle
      }
    }
  `
  const brands = await queryAll(gql, 200, "brands")
  
  if(!brands?.length) 
    throw new Error();

  const esBrands = brands.map(brand => {
    return {
      id: brand._id,
      body: {
        id: brand._id,
        name: brand.name,
        handle: brand.handle
      }
    }
  })

  return await esIndex('brands', esBrands)
}

export async function indexSeries(args): Promise<SearchResponse> {

  const gql = `
    query GetSeriesForIndexing($limit: Float!, $page: Float!){
      series(dereference: true, limit: $limit, page: $page) {
        _id
        name
        handle
        brand {
          _id
          name
        }
      }
    }
  `
  const series = await queryAll(gql, 200, "series")
  
  if(!series?.length) 
    throw new Error();

  const esSeries = series.map(s => {
    return {
      id: s._id,
      body: {
        id: s._id,
        name: s.name,
        brand: s.brand.name,
        handle: s.handle
      }
    }
  })

  return await esIndex('series', esSeries)
}