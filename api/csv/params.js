/* eslint-disable complexity */

export function prepareParams(item, {reverse, columns, citycode, postcode, type, category, lat, lon}) {
  const params = {}

  if (!reverse && columns) {
    const stringToGeocode = columns
      .map(c => c in item ? item[c].trim() : '')
      .join(' ')
      .trim()

    params.q = stringToGeocode
  }

  if (type && item[type]) {
    params.type = item[type]
  }

  if (citycode && item[citycode]) {
    params.citycode = item[citycode]
  }

  if (postcode && item[postcode]) {
    params.postcode = item[postcode]
  }

  if (category && item[category]) {
    params.category = item[category]
  }

  const extractedLat = getLat(item, lat)
  const extractedLon = getLon(item, lon)

  if (extractedLat && extractedLon && !Number.isNaN(extractedLat) && !Number.isNaN(extractedLon)) {
    params.lat = extractedLat
    params.lon = extractedLon
  }

  if (reverse && !params.lat) {
    return null
  }

  if (!reverse && (!params.q || params.q.length < 3 || params.q.length > 200 || !isFirstCharValid(params.q.charAt(0)))) {
    return null
  }

  return params
}

export function isFirstCharValid(firstChar) {
  return (firstChar.toLowerCase() !== firstChar.toUpperCase())
    || (firstChar.codePointAt(0) >= 48 && firstChar.codePointAt(0) <= 57)
}

export function getLon(item, fieldName) {
  if (fieldName) {
    return Number.parseFloat(item[fieldName])
  }

  if (item.longitude) {
    return Number.parseFloat(item.longitude)
  }

  if (item.lon) {
    return Number.parseFloat(item.lon)
  }

  if (item.lng) {
    return Number.parseFloat(item.lng)
  }

  if (item.long) {
    return Number.parseFloat(item.long)
  }
}

export function getLat(item, fieldName) {
  if (fieldName) {
    return Number.parseFloat(item[fieldName])
  }

  if (item.latitude) {
    return Number.parseFloat(item.latitude)
  }

  if (item.lat) {
    return Number.parseFloat(item.lat)
  }
}
