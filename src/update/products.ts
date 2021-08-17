import { SearchRequestError, SearchResponse } from "../types";
import { context } from '../core/context'

const queryAll = async (gql, limit, dataKey) => {

  let page = 1
  let data = []

  while(true){

    let gqlResponse = null;

    const queryArgs = { page, limit }

    gqlResponse = await context().urqlClient.query(gql, queryArgs).toPromise()

    if(gqlResponse.error || !gqlResponse.data) {
      console.log(gqlResponse)
      throw new Error()
    }

    const _data = gqlResponse.data[dataKey]

    data = data.concat(_data) 

    if(_data.length < limit) break;

    page++
  }

  return data;
}

const keywordConditionMatchesProperty = (condition, value) => {

  switch(condition.operator){
    case "eq":
      return value == condition.value;
    case "ne":
      return value != condition.value;
    case "lt":
      return parseFloat(value) < parseFloat(condition.value);
    case "gt":
      return parseFloat(value) > parseFloat(condition.value);
    case "lte":
      return parseFloat(value) <= parseFloat(condition.value);
    case "gte":
      return parseFloat(value) >= parseFloat(condition.value);
    case "contains":
      return condition.value?.includes(value) || false;
  }

}

const keywordMatchesProperties = (keyword, properties) => {

  if(keyword.conditionLogic == "and"){
    
    for(const condition of keyword.conditions){

      const _pid = condition.property._id.toString()
      const property = properties.find(p => p.property._id == _pid)

      if(!property || !keywordConditionMatchesProperty(condition, property.value))
        return false;
    }

    return true;
  }
  else if(keyword.conditionLogic == "or"){

    for(const condition of keyword.conditions){

      const _pid = condition.property._id.toString()
      const property = properties.find(p => p.property._id == _pid)

      if(property && keywordConditionMatchesProperty(condition, property.value))
        return true;
    }
  }

  return false;
}

const getElasticProperties = properties => {
  return properties
    .filter(p => p.value == "true" && p.property.dataType == "boolean")
    .map(p => p.property._id)
}

async function indexProducts(args): Promise<SearchResponse> {

  let response: SearchResponse = {};

  if(!args.authorized){
    response.errors = [ SearchRequestError.permissionDenied ]
    return response;
  }

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
      name: product.name,
      series: product.series?.name || "",
      brand: product.brand.name,
      seriesHandle: product.series?.handle || "",
      brandHandle: product.brand.handle,
      title,
      variantTitles,
      eans,
      keywords,
      properties,
      ingredients
    }
  })

  const r = await context().esClient.deleteByQuery({
    index: "products",
    body: {
      query: {
        match_all: {}
      }
    }
  })

  console.log(r)
  const stepSize = 20

  for(let i = 0; true; i += stepSize){

    const _products = esProducts.slice(i, i + stepSize)

    if(!_products.length) break;

    await Promise.all(_products.map(product => {

      return context().esClient.index({
        index: "products",
        id: product.id,
        body: product
      })
    }))

  }

  return response;
}

export {
  indexProducts
}