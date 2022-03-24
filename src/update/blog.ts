import { SearchResponse } from "../types";
import { queryAll } from '@sergei-gaponik/hedo2.lib.util'
import esIndex from '../core/esIndex'

export async function indexArticles(args): Promise<SearchResponse> {

  const gql = `
    query GetArticlesForIndexing($limit: Float!, $page: Float!){
      articles(limit: $limit, page: $page) {
        _id
        published
        name
        tags
        handle
        body
        author
        image {
          src
        }
      }
    }
  `
  const articles = await queryAll(gql, 200, "articles")

  if(!articles?.length) 
    throw new Error();

  const esArticles = articles.map(article => ({
    id: article._id,
    body: {
      id: article._id,
      published: article.published,
      name: article.name,
      tags: article.tags,
      body: article.body,
      author: article.author,
      imageSrc: article.image?.src,
      handle: article.handle
    }
  }))

  return await esIndex('articles', esArticles)

}