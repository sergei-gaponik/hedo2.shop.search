import { SearchResponse } from "../types";
import { queryAll } from '@sergei-gaponik/hedo2.lib.util'
import esIndex from '../core/esIndex'
import * as fs from "fs"
import * as path from 'path'
import { context } from "../core/context";
import articlesMapping from './mappings/articles'

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

export async function deleteArticlesIndex(): Promise<SearchResponse> {

  const r = await context().esClient.indices.delete({ index: "articles" })
  console.log(r)

  return {}
}

export async function createArticlesIndex(): Promise<SearchResponse> {

  const r = await context().esClient.indices.create({ 
    index: "articles", 
    body: articlesMapping
  })

  console.log(r)

  return {}
}