import { SearchResponse } from "../types";
import { queryAll } from '@sergei-gaponik/hedo2.lib.util'
import esIndex from '../core/esIndex'

async function indexPages(args): Promise<SearchResponse> {

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
  const pages = await queryAll(process.env.SYSTEM_API_ENDPOINT, gql, 200, "pages")
  
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

export {
  indexPages
}