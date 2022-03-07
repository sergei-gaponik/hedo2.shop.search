import { SearchRequestError, SearchResponse } from "../types";
import { context } from '../core/context'
import { queryAll } from '@sergei-gaponik/hedo2.lib.util'
import { clearCache } from '../core/esHandler'
import { keywordMatchesProperties, getElasticProperties } from '../util/keywords'
import esIndex from '../core/esIndex'


export async function indexProducts(args): Promise<SearchResponse> {

  const getProductsForIndexing = `
    query GetProductsForIndexing($limit: Float!, $page: Float!){
      products(dereference: true, limit: $limit, page: $page) {
        _id
        name
        series {
          _id
          handle
          name
        }
        brand {
          _id
          handle
          name
        }
        variants {
          title
          items {
            inventoryItem {
              ean
            }
          }
        }
        properties {
          property {
            _id
            dataType
            name
            handle
          }
          value
        }
        ingredients {
          _id
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

  const getProductIngredients = `
    query GetProductIngredients($limit: Float!, $page: Float!){
      productIngredients(limit: $limit, page: $page) {
        _id
        name
        keywordsIfPresent
        keywordsIfNotPresent
      }
    }
  `

  const [ products, productKeywords, productIngredients ] = await Promise.all([
    queryAll(getProductsForIndexing, 200, "products"),
    queryAll(getProductKeywords, 200, "productKeywords"),
    queryAll(getProductIngredients, 200, "productIngredients")
  ])

  if(!products?.length) 
    throw new Error();

  const esProducts = products.map(product => {
    
    let keywords = []

    for(const keyword of productKeywords){

      if(keywordMatchesProperties(keyword, product.properties)){

        keywords.push(keyword.name)

        if(keyword.aliases)
          keywords = keywords.concat(keyword.aliases)
      }
    }

    keywords = [...new Set(keywords)]

    const eans = product.variants.reduce((acc, variant) => {
      variant.items.forEach(i => acc.push(i.inventoryItem.ean))
      return acc;
    }, [])

    const ingredients = productIngredients.flatMap(ingredient => {

      if(product.ingredients.find(a => a._id == ingredient._id.toString()))
        return ingredient.keywordsIfPresent
      else
        return ingredient.keywordsIfNotPresent
    })

    const variantTitles = product.variants.map(v => v.title)

    const title = `${product.brand.name} ${product.series?.name || ""} ${product.name}`

    const properties = getElasticProperties(product.properties)

    return {
      id: product._id,
      body: {
        id: product._id,
        name: product.name,
        series: product.series?.name || "",
        brand: product.brand.name,
        seriesHandle: product.series?.handle || "",
        brandHandle: product.brand.handle,
        collections: [],
        title,
        variantTitles,
        eans,
        keywords,
        properties,
        ingredients
      }
    }
  })

  return await esIndex('products', esProducts)
}