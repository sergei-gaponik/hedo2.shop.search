
export enum SearchRequestError {
  "pathNotFound" = "pathNotFound",
  "missingArgs" = "missingArgs",
  "permissionDenied" = "permissionDenied",
  "internalServerError" = "internalServerError",
  "badRequest" = "badRequest",
  "notFound" = "notFound",
  "wrongContentType" = "wrongContentType"
}

export interface SearchRequest {
  path?: string
  args?: any
  bulk?: SearchRequest[]
}

export interface SearchResponse {
  errors?: SearchRequestError[]
  data?: any
  bulk?: SearchResponse[]
}