import { SearchRequestError, SearchResponse } from "../types";
import { context } from '../core/context'


async function getGlobalSearchResults(args): Promise<SearchResponse> {

  let response: SearchResponse = {};

  const _query = args.query || null

  if(!_query){
    response.errors = [ SearchRequestError.missingArgs ]
    return response;
  }

  if(typeof _query !== "string"){
    response.errors = [ SearchRequestError.badRequest ]
    return response;
  }

  const esProductsResponse: any = await context().esClient.search({
    index: 'products',
    body: {
      query: {
        bool: {
          should: [
            {
              match_phrase_prefix: {
                title: {
                  query: _query,
                  slop: 2
                }
              }
            },
            {
              match: {
                keywords: {
                  fuzziness: "auto",
                  query: _query
                }
              }
            }
          ]
        }
      },
      _source: false
    }
  })

  const products = esProductsResponse.body.hits.hits

  response.data = { products }

  return response;
}

export {
  getGlobalSearchResults
}