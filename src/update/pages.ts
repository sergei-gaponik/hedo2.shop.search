import { SearchResponse } from "../types";
import { queryAll } from '@sergei-gaponik/hedo2.lib.util'
import esIndex from '../core/esIndex'
import { context } from "../core/context";
import pagesMapping from './mappings/pages'

export async function indexPages(args): Promise<SearchResponse> {

  const gql = `
    query GetPagesForIndexing($limit: Float!, $page: Float!){
      pages(limit: $limit, page: $page) {
        _id
        name
        aliases
        href
      }
    }
  `
  const pages = await queryAll(gql, 200, "pages")
  
  if(!pages?.length) 
    throw new Error();

  const esPages = pages.map(page => ({
    id: page._id,
    body: {
      id: page._id,
      name: page.name,
      aliases: [ page.name, ...page.aliases ],
      href: page.href
    }
  }))

  return await esIndex('pages', esPages)
}

export async function deletePagesIndex(): Promise<SearchResponse> {

  const r = await context().esClient.indices.delete({ index: "pages" })
  console.log(r)

  return {}
}

export async function createPagesIndex(): Promise<SearchResponse> {


  const r = await context().esClient.indices.create({ 
    index: "pages", 
    body: pagesMapping
  })
  console.log(r)

  return {}
}