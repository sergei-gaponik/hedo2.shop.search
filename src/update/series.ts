import { SearchRequestError, SearchResponse } from "../types";
import { context } from '../core/context'
import { queryAll } from '@sergei-gaponik/hedo2.lib.util'
import esIndex from '../core/esIndex'
import seriesMapping from './mappings/series'

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

export async function deleteSeriesIndex(): Promise<SearchResponse> {

  const r = await context().esClient.indices.delete({ index: "series" })
  console.log(r)

  return {}
}

export async function createSeriesIndex(): Promise<SearchResponse> {

  const r = await context().esClient.indices.create({ 
    index: "series", 
    body: seriesMapping
  })
  console.log(r)

  return {}
}