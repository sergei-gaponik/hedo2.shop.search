import { FastifyRequest, FastifyReply } from 'fastify'
import { SearchRequestError, SearchRequest, SearchResponse } from '../types'
import systemRoutes from './systemRoutes'
import { magenta } from 'colors/safe'
import { performance } from 'perf_hooks'
import { crc } from '@sergei-gaponik/hedo2.lib.util'

export default async function systemHandler(req: FastifyRequest, reply: FastifyReply){

  const startTime = performance.now()

  const _r = await (async (): Promise<SearchResponse> => {
    
    if(req.headers["content-type"] != "application/json")
      return { errors: [ SearchRequestError.wrongContentType ] }

    if(req.headers["authorization"] != `Bearer ${process.env.SECRET_KEY}`)
      return { errors: [ SearchRequestError.permissionDenied ]}
    
    const body: SearchRequest = req.body;

    try{

      let args: any = body.args || {}

      if(!systemRoutes.hasOwnProperty(body.path))
        return { errors: [ SearchRequestError.pathNotFound ] };

      return await systemRoutes[body.path](args);
    }
    catch(e){
      console.log(e)
      return { errors: [ SearchRequestError.internalServerError ] };
    }

  })()

  const execTime = Math.round((performance.now() - startTime) * 100) / 100

  let _log: any = { 
    path: (req.body as any).path || null,
    execTime,
    crc: crc(JSON.stringify(req.body)),
  }

  if(_r.errors)
    _log.errors = _r.errors
  

  console.log(magenta("system"), _log)

  reply.code(200)
    .header('Content-Type', 'application/json; charset=utf-8')
    .send(_r)
}