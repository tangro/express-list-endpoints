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
  var stack = app.stack || (app._router && app._router.stack);
  console.log('stack', stack);
  app.route && console.log('route.stack', app.route.stack);

  endpoints = endpoints || []
  basePath = basePath || ''
  var middleWare = [], hasRoute = false;

  var routePath;
  stack.forEach(function (stackItem) {
    if (stackItem.route) {
      routePath = basePath + (basePath && stackItem.route.path === '/' ? '' : stackItem.route.path);
    } else if (regexpExpressRegexp.test(stackItem.regexp)) {
      routePath = basePath + '/' + parseExpressPath(stackItem.regexp, stackItem.keys);
    } else {
      routePath = basePath;
    }
    console.log('stackItem', routePath, JSON.stringify(stackItem, null, 2));

    if (stackItem.route) {
      endpoints.push(entry(routePath, getRouteMethods(stackItem.route), middleWare));
      parseEndpoints(stackItem.route, routePath, endpoints);
      hasRoute = true;
      console.log('route', routePath, basePath, stackItem.name);
    } else if (stackItem.name === 'router' || stackItem.name === 'bound dispatch') {
      parseEndpoints(stackItem.handle, routePath, endpoints)
    } else {
      console.log('middleWare', routePath, stackItem.name === '<anonymous>' ? stackItem.handle : stackItem.name );
      middleWare = middleWare.concat(stackItem.name);
    }
  });
  
  if (!hasRoute) {
    endpoints.push(entry(routePath, [], middleWare));
  }

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
