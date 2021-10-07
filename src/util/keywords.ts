

function keywordConditionMatchesProperty(condition, value) {

  switch(condition.operator){
    case "eq":
      return value == condition.value;
    case "ne":
      return value != condition.value;
    case "lt":
      return parseFloat(value) < parseFloat(condition.value);
    case "gt":
      return parseFloat(value) > parseFloat(condition.value);
    case "lte":
      return parseFloat(value) <= parseFloat(condition.value);
    case "gte":
      return parseFloat(value) >= parseFloat(condition.value);
    case "contains":
      return condition.value?.includes(value) || false;
  }

}

export function keywordMatchesProperties(keyword, properties) {

  if(!keyword.conditionLogic || keyword.conditionLogic == "and"){
    
    for(const condition of keyword.conditions){

      const _pid = condition.property._id.toString()
      const property = properties.find(p => p.property._id == _pid)

      if(!property || !keywordConditionMatchesProperty(condition, property.value))
        return false;
    }

    return true;
  }
  else if(keyword.conditionLogic == "or"){

    for(const condition of keyword.conditions){

      const _pid = condition.property._id.toString()
      const property = properties.find(p => p.property._id == _pid)

      if(property && keywordConditionMatchesProperty(condition, property.value))
        return true;
    }
  }

  return false;
}

export function getElasticProperties(properties) {
  return properties
    .filter(p => p.value == "true" && p.property.dataType == "boolean")
    .map(p => p.property.handle)
}