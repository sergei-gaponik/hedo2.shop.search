import routes from './routes'
import { FastifyRequest, FastifyReply } from 'fastify'
import { SearchRequestError, SearchRequest, SearchResponse } from '../types'

export default async function handler(req: FastifyRequest, reply: FastifyReply){

  const _r = await (async (): Promise<SearchResponse> => {
    
    if(req.headers["content-type"] != "application/json")
      return { errors: [ SearchRequestError.wrongContentType ] }
    
    const body: SearchRequest = req.body
    
    let args: any = body.args || {}
    
    if(!routes.hasOwnProperty(body.path))
      return { errors: [ SearchRequestError.pathNotFound ] }
    
    args.authorized = req.headers["authorization"] == `Bearer ${process.env.SECRET_KEY}`

    try{
      return await routes[body.path](args);
    }
    catch(e){
      console.log(e)
      return { errors: [ SearchRequestError.internalServerError ]};
    }

  })()

  reply.code(200)
    .header('Content-Type', 'application/json; charset=utf-8')
    .send(_r)
}