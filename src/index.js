// var debug = require('debug')('express-list-endpoints')
var regexpExpressRegexp = /^\/\^\\\/(?:(:?[\w\\.-]*(?:\\\/:?[\w\\.-]*)*)|(\(\?:\(\[\^\\\/]\+\?\)\)))\\\/.*/
var regexpExpressParam = /\(\?:\(\[\^\\\/]\+\?\)\)/g

/**
 * Returns all the verbs detected for the passed route
 */
var getRouteMethods = function (route) {
  var methods = []

  for (var method in route.methods) {
    if (method === '_all') continue

    methods.push(method.toUpperCase())
  }

  return methods
}

/**
 * Returns true if found regexp related with express params
 */
var hasParams = function (pathRegexp) {
  return regexpExpressParam.test(pathRegexp)
}

/**
 * @param {string} routePath Express route path
 * @param {string[]} methods The methods for this route
 * @param {string} middleWare middleWare on this route
 * @return {Object} Endpoint info
 */
var entry = function (routePath, methods, middleWare) {
  return {
    path: routePath,
    methods,
    middleWare
  }
}

var parseExpressPath = function (expressPathRegexp, params) {
  var parsedPath = regexpExpressRegexp.exec(expressPathRegexp)
  var parsedRegexp = expressPathRegexp
  var paramIdx = 0

  while (hasParams(parsedRegexp)) {
    parsedRegexp = parsedRegexp.toString().replace(/\(\?:\(\[\^\\\/]\+\?\)\)/, ':' + params[paramIdx].name)
    paramIdx++
  }

  if (parsedRegexp !== expressPathRegexp) {
    parsedPath = regexpExpressRegexp.exec(parsedRegexp)
  }

  parsedPath = parsedPath[1].replace(/\\\//g, '/')

  return parsedPath
}

var parseEndpoints = function (app, basePath, endpoints) {
  var stack = app.stack || (app._router && app._router.stack)

  endpoints = endpoints || []
  basePath = basePath || ''

  let stackRoute = undefined;
  stack.forEach(function (stackItem) {
    var routePath;
    if (stackItem.route) {
      routePath = basePath + (basePath && stackItem.route.path === '/' ? '' : stackItem.route.path);
    } else if (regexpExpressRegexp.test(stackItem.regexp)) {
      routePath = basePath + '/' + parseExpressPath(stackItem.regexp, stackItem.keys);
    } else {
      routePath = basePath;
    }

    if (stackItem.route) {
      stackRoute = entry(routePath, getRouteMethods(stackItem.route));
      endpoints.push(stackRoute);
      // console.log('route', routePath, basePath, stackItem.name);
    } else if (stackItem.name === 'router' || stackItem.name === 'bound dispatch') {
      parseEndpoints(stackItem.handle, routePath, endpoints)
    } else {
      // console.log('middleWare', routePath, stackItem.name === '<anonymous>' ? stackItem.handle : stackItem.name );
      if (stackRoute) {
        stackRoute.middleWare = [...stackRoute.middleWare, stackItem.name];
      } else {
        endpoints.push(entry(routePath, [], [stackItem.name]));
      }
    }
  })

  return endpoints
}

/**
 * Returns an array of strings with all the detected endpoints
 * @param {Object} app the express/route instance to get the endponts from
 */
var getEndpoints = function (app) {
  return parseEndpoints(app)
}

module.exports = getEndpoints
