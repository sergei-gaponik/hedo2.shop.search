import { FastifyRequest, FastifyReply } from 'fastify'
import { SearchRequestError, SearchRequest, SearchResponse } from '../types'
import systemRoutes from './systemRoutes'

export default async function systemHandler(req: FastifyRequest, reply: FastifyReply){

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

  reply.code(200)
    .header('Content-Type', 'application/json; charset=utf-8')
    .send(_r)
}