import { SearchResponse } from "../types";
import { queryAll } from '@sergei-gaponik/hedo2.lib.util'
import { keywordMatchesProperties } from '../util/keywords'
import esIndex from '../core/esIndex'

export async function indexCategories(args): Promise<SearchResponse> {

  const getCategories = `
    query GetCategoriesForIndexing($limit: Float!, $page: Float!){
      productCategories(dereference: true, limit: $limit, page: $page) {
        _id
        title
        handle
        name
        andCondition {
          properties {
            _id
            dataType
            name
            handle
          }
        }
      }
    }
  `

  const getProductKeywords = `
    query GetProductKeywords($limit: Float!, $page: Float!){
      productKeywords(limit: $limit, page: $page) {
        _id
        name
        aliases
        conditions {
          value
          property {
            _id
          }
          operator
        }
        conditionLogic
      }
    }
  `

  const [ categories, productKeywords ] = await Promise.all([
    queryAll(getCategories, 200, "productCategories"),
    queryAll(getProductKeywords, 200, "productKeywords")
  ])


  const esCategories = categories.map(category => {

    const properties = category.andCondition
      .flatMap(a => a.properties)
      .map(a => ({ property: a, value: "true" }))

    let keywords = []

    for(const keyword of productKeywords){

      if(keywordMatchesProperties(keyword, properties)){

        keywords.push(keyword.name)

        if(keyword.aliases)
          keywords = keywords.concat(keyword.aliases)
      }
    }

    keywords = [...new Set(keywords)]

    return {
      id: category._id,
      body: {
        id: category._id,
        name: category.name,
        title: category.title,
        keywords,
        handle: category.handle
      }
    }
  })
  
  if(!esCategories?.length) 
    throw new Error();

  return await esIndex('categories', esCategories)
}