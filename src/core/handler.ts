import { Request, Response } from "express";
import routes from './routes'
import { SearchRequestError, SearchRequest, SearchResponse } from '../types'

export default async function handler(req: Request, res: Response){

  
  const _r = await (async (): Promise<SearchResponse> => {
    
    if(req.headers["content-type"] != "application/json")
      return { errors: [ SearchRequestError.wrongContentType ] }
    
    const request: SearchRequest = req.body

    if(!routes.hasOwnProperty(request.path))
      return { errors: [ SearchRequestError.pathNotFound ] }

    return await routes[request.path](request.args)

  })()

  res.json(_r)
}