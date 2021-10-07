import { context } from '../core/context'
import { crc } from '@sergei-gaponik/hedo2.lib.util'

let cache = {}

const CACHE_DURATION = 1000
const CACHE_LIMIT = 1000

export async function esHandler(req){

  const hash = crc(JSON.stringify(req))

  if(cache[hash]){

    if(cache[hash].ts > Date.now() - (CACHE_DURATION * 1000))
      return cache[hash].value
    else
      delete cache[hash]
  }
  
  const r = await context().esClient.search(req)

  if(Object.keys(cache).length < CACHE_LIMIT){
    
    cache[hash] = {
      value: r,
      ts: Date.now()
    }
  }

  return r;
}

export function clearCache(){
  cache = {}
}