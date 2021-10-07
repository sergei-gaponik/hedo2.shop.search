import * as _products from '../api/products'
import * as _brands from '../api/brands'
import * as _categories from '../api/categories'
import * as _pages from '../api/pages'
import * as _blog from '../api/blog'

const routes = {
  ..._products,
  ..._brands,
  ..._categories,
  ..._pages,
  ..._blog
}

export default routes