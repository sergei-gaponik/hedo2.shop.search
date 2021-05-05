
export enum SearchRequestError {
  "pathNotFound" = "pathNotFound",
  "missingArgs" = "missingArgs",
  "permissionDenied" = "permissionDenied",
  "internalServerError" = "internalServerError",
  "badRequest" = "badRequest",
  "notFound" = "notFound",
  "wrongContentType" = "wrongContentType"
}

export enum SearchResponseOrigin {
  "cached" = "cached",
  "api" = "api"
}

export interface SearchRequest {
  path: string
  token?: string
  args?: any
}

export interface SearchResponse {
  errors?: SearchRequestError[]
  data?: any
  origin?: SearchResponseOrigin
}