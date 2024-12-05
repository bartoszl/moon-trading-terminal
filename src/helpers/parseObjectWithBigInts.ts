export const parseObjectWithBigInts = (object: any) => {
  return Object.keys(object).reduce((result,key) => {
    return {
      ...result,
      [key]: typeof object[key] === 'bigint' ? object[key].toString() : object[key],
    }
  }, {})
}
