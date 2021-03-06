import { SearchRequestError, SearchResponse } from "../types";
import { context } from '../core/context'
import { queryAll } from '@sergei-gaponik/hedo2.lib.util'
import esIndex from '../core/esIndex'
import brandsMapping from './mappings/brands'

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

export async function deleteBrandsIndex(): Promise<SearchResponse> {

  const r = await context().esClient.indices.delete({ index: "brands" })
  console.log(r)

  return {}
}

export async function createBrandsIndex(): Promise<SearchResponse> {

  const r = await context().esClient.indices.create({ 
    index: "brands", 
    body: brandsMapping
  })
  console.log(r)

  return {}
}