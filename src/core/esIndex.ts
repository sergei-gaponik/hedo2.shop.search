import { clearCache } from './esHandler'
import { context } from './context'
import { SearchResponse } from '../types'

interface ESItem {
  id: string,
  body: any
}

export default async function esIndex(key: string, items: ESItem[]): Promise<SearchResponse> {

  const r = await context().esClient.deleteByQuery({
    index: key,
    body: {
      query: {
        match_all: {}
      }
    }
  })

  const stepSize = 20

  for(let i = 0; true; i += stepSize){

    const _items = items.slice(i, i + stepSize)

    if(!_items.length) break;

    await Promise.all(_items.map(item => {

      return context().esClient.index({
        index: key,
        id: item.id,
        body: item.body
      })
    }))
  }
  clearCache()

  return {}
}