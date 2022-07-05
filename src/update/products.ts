import { SearchRequestError, SearchResponse } from "../types";
import { context } from '../core/context'
import { queryAll } from '@sergei-gaponik/hedo2.lib.util'
import { clearCache } from '../core/esHandler'
import { keywordMatchesProperties, getElasticProperties } from '../util/keywords'
import esIndex from '../core/esIndex'
import { Variant } from '@sergei-gaponik/hedo2.lib.models'
import * as fs from "fs";
import * as path from 'path'

function getMaxDiscount(variants: Variant[]){

  return variants.reduce((maxDiscount, variant) => {
    if(!variant.recommendedRetailPrice)
      return maxDiscount;
    
    const _discount = 1 - (variant.price / variant.recommendedRetailPrice)

    if(_discount > maxDiscount)
      return _discount;
  }, 0)
}

export async function indexProducts(args): Promise<SearchResponse> {

  const getProductsForIndexing = `
    query GetProductsForIndexing($limit: Float!, $page: Float!){
      products(dereference: true, limit: $limit, page: $page) {
        _id
        _created
        boost
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
          ean
          price
          recommendedRetailPrice
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

    keywords = [ ...new Set(keywords) ]

    const ingredients = productIngredients.flatMap(ingredient => {

      if(product.ingredients.find(a => a._id == ingredient._id.toString()))
        return ingredient.keywordsIfPresent
      else
        return ingredient.keywordsIfNotPresent
    })

    const variantTitles = product.variants.map(v => v.title)
    const eans = product.variants.map(v => v.ean)
    const price = product.variants.map(v => v.price)

    const discount = getMaxDiscount(product.variants)

    const title = `${product.brand.name} ${product.series?.name || ""} ${product.name}`

    const properties = getElasticProperties(product.properties)

    return {
      id: product._id,
      body: {
        id: product._id,
        created: product._created,
        boost: product.boost || 0,
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
        ingredients,
        price,
        discount
      }
    }
  })

  return await esIndex('products', esProducts)
}

export async function deleteProductsIndex(): Promise<SearchResponse> {

  const r = await context().esClient.indices.delete({ index: "products" })
  console.log(r)

  return {}
}

export async function createProductsIndex(): Promise<SearchResponse> {

  const body = await fs.promises.readFile(path.join(__dirname, "./es_mappings/products.json"))

  const r = await context().esClient.indices.create({ index: "products", body })
  console.log(r)

  return {}
}