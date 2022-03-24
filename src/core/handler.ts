import routes from './routes'
import { FastifyRequest, FastifyReply } from 'fastify'
import { SearchRequestError, SearchRequest, SearchResponse } from '../types'
import { performance } from 'perf_hooks'
import { crc } from '@sergei-gaponik/hedo2.lib.util'

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const _handler = async (body: SearchRequest): Promise<SearchResponse> => {

  let args: any = body.args || {}
    
  if(!routes.hasOwnProperty(body.path))
    return { errors: [ SearchRequestError.pathNotFound ] }
  
  try{
    return await routes[body.path](args);
  }
  catch(e){
    console.log(e)
    return { errors: [ SearchRequestError.internalServerError ]};
  }
}

export default async function handler(req: FastifyRequest, reply: FastifyReply){

  const startTime = performance.now()

  const _r = await (async (): Promise<SearchResponse> => {
    
    if(req.headers["content-type"] != "application/json")
      return { errors: [ SearchRequestError.wrongContentType ] }
    
    const body: SearchRequest = req.body

    if(body.bulk){
      
      const r = await Promise.all(body.bulk.map(req => _handler(req)))

      return { bulk: r }
    }
    
    return _handler(body)
    

  })()

  const execTime = Math.round((performance.now() - startTime) * 100) / 100

  let _log: any = { 
    path: (req.body as any).path || (req.body as any).bulk?.map(a => a.path) || null,
    execTime,
    crc: crc(JSON.stringify(req.body)),
  }

  if(_r.errors)
    _log.errors = _r.errors
  

  console.log(_log)

  reply.code(200)
    .header('Content-Type', 'application/json; charset=utf-8')    
    .send(_r)
}