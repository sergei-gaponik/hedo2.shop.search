import { SearchResponse } from "../types";
import { queryAll } from '@sergei-gaponik/hedo2.lib.util'
import esIndex from '../core/esIndex'

export async function indexArticles(args): Promise<SearchResponse> {

  const gql = `
    query GetArticlesForIndexing($limit: Float!, $page: Float!){
      articles(limit: $limit, page: $page) {
        _id
        name
        tags
        handle
        body
      }
    }
  `
  const articles = await queryAll(process.env.SYSTEM_API_ENDPOINT, gql, 200, "articles")
  
  if(!articles?.length) 
    throw new Error();

  const esArticles = articles.map(article => ({
    id: article._id,
    body: {
      id: article._id,
      name: article.name,
      tags: article.tags,
      body: article.body,
      handle: article.handle
    }
  }))

  return await esIndex('articles', esArticles)

}