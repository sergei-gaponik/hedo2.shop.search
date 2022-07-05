export default {
  "mappings": {
    "properties": {
      "brandHandle": {
        "type": "keyword"
      },
      "seriesHandle": {
        "type": "keyword"
      },
      "eans": {
        "type": "keyword"
      },
      "handle": {
        "type": "keyword"
      },
      "properties": {
        "type": "keyword"
      },
      "title": {
        "type": "text",
        "analyzer": "german"
      },
      "keywords": {
        "type": "text",
        "analyzer": "german"
      },
      "price": {
        "type": "float"
      },
      "discount": {
        "type": "float"
      },
      "created": {
        "type": "float"
      },
      "boost": {
        "type": "float"
      }
    }
  }
}
