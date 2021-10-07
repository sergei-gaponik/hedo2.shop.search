import * as _products from '../update/products'
import * as _brands from '../update/brands'
import * as _categories from '../update/categories'
import * as _pages from '../update/pages'
import * as _blog from '../update/blog'

const routes = {
  ..._products,
  ..._brands,
  ..._categories,
  ..._pages,
  ..._blog
}

export default routes