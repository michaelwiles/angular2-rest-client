/*

angular2-rest
(c) Domonkos Pal
License: MIT

Table of Contents:

- class RESTClient

- Class Decorators:
    @BaseUrl(String)
    @DefaultHeaders(Object)

- Method Decorators:
    @GET(url: String)
    @POST(url: String)
    @PUT(url: String)
    @DELETE(url: String)
    @Headers(object)

- Parameter Decorators:
    @Path(string)
    @Query(string)
    @Header(string)
    @Body

*/

import {Injectable, Inject, Injector} from 'angular2/angular2';
import {
Http, Headers as AngularHeaders,
Request, RequestOptions, RequestMethod as RequestMethods, RequestOptionsArgs,
Response,
URLSearchParams
} from 'angular2/http';

/**
* Angular 2 RESTClient class.
*
* @class RESTClient
* @constructor
*/
export class RESTClient {

    public constructor( @Inject(Http) protected http: Http) {
    }

    protected getBaseUrl(): string {
        return null;
    };

    protected getDefaultHeaders(): Object {
        return null;
    };

    /**
    * Request Interceptor
    *
    * @method requestInterceptor
    * @param {Request} req - request object
    */
    protected requestInterceptor(req: Request) {
    }

    /**
    * Response Interceptor
    *
    * @method responseInterceptor
    * @param {Response} res - response object
    * @returns {Response} res - transformed response object
    */
    protected responseInterceptor(res: Response): Response {
        return res
    }

}

/**
 * Set the base URL of REST resource
 * @param {String} url - base URL
 */
export function BaseUrl(url: string) {
    return function <TFunction extends Function>(Target: TFunction): TFunction {
        Target.prototype.getBaseUrl = function() {
            return url;
        }
        return Target;
    }
}

/**
 * Set default headers for every method of the RESTClient
 * @param {Object} headers - deafult headers in a key-value pair
 */
export function DefaultHeaders(headers: any) {
    return function <TFunction extends Function>(Target: TFunction): TFunction {
        Target.prototype.getDefaultHeaders = function() {
            return headers;
        }
        return Target;
    }
}

function paramBuilder(paramName: string) {
    return function(key: string) {
        return function(target: RESTClient, propertyKey: string | symbol, parameterIndex: number) {
            var metadataKey = `${propertyKey}_${paramName}_parameters`;
            var paramObj: any = {
                parameterIndex: parameterIndex,
                key: key
            }
            if (Array.isArray(target[metadataKey])) {
                target[metadataKey].push(paramObj);
            }
            else {
                target[metadataKey] = [paramObj];
            }
        };
    };
}

/**
 * Path variable of a method's url, type: string
 * @param {string} key - path key to bind value
 */
export var Path = paramBuilder("Path");
/**
 * Query value of a method's url, type: string
 * @param {string} key - query key to bind value
 */
export var Query = paramBuilder("Query");
/**
 * Body of a REST method, type: key-value pair object
 * Only one body per method!
 */
export var Body = paramBuilder("Body")("Body");
/**
 * Custom header of a REST method, type: string
 * @param {string} key - header key to bind value
 */
export var Header = paramBuilder("Header");


/**
 * Set custom headers for a REST method
 * @param {Object} headersDef - custom headers in a key-value pair
 */
export function Headers(headersDef: any) {
    return function(target: RESTClient, propertyKey: string, descriptor: any) {
        descriptor.headers = headersDef;
        return descriptor;
    }
}

function methodBuilder(method: number) {
    return function(url: string) {
        return function(target: RESTClient, propertyKey: string, descriptor: any) {

            var pPath = target[`${propertyKey}_Path_parameters`];
            var pQuery = target[`${propertyKey}_Query_parameters`];
            var pBody = target[`${propertyKey}_Body_parameters`];
            var pHeader = target[`${propertyKey}_Header_parameters`];

            descriptor.value = function(...args: any[]) {

                // Body
                var body = null;
                if (pBody) {
                    body = JSON.stringify(args[pBody[0].parameterIndex]);
                }

                // Path
                if (pPath) {
                    for (k in pPath) {
                        url = url.replace("{" + pPath[k].key + "}", args[pPath[k].parameterIndex]);
                    }
                }

                // Query
                var search = new URLSearchParams()
                if (pQuery) {
                    pQuery
                        .filter(p => args[p.parameterIndex]) // filter out optional parameters
                        .forEach(p => {
                            var key = p.key;
                            var value = args[p.parameterIndex];
                            // if the value is a instance of Object, we stringify it
                            if (value instanceof Object) {
                                value = JSON.stringify(value);
                            }
                            search.set(encodeURIComponent(key), encodeURIComponent(value));
                        })
                }

                // Headers
                var headers = new AngularHeaders(this.getDefaultHeaders());
                for (var k in descriptor.headers) {
                    headers.append(k, descriptor.headers[k]);
                }
                if (pHeader) {
                    for (var k in pHeader) {
                        headers.append(pHeader[k].key, args[pHeader[k].parameterIndex]);
                    }
                }

                // Request options
                var options = new RequestOptions({
                    method,
                    url: this.getBaseUrl() + url,
                    headers,
                    body,
                    search
                });

                var req = new Request(options);

                // intercept the request
                this.requestInterceptor(req);
                // make the request and store the observable for later transformation
                var observable = this.http.request(req);
                // intercept the response
                observable = observable.map(this.responseInterceptor);

                return observable;
            };

            return descriptor;
        };
    }
}

/**
 * GET method
 * @param {string} url - resource url of the method
 */
export var GET = methodBuilder(RequestMethods.Get);
/**
 * POST method
 * @param {string} url - resource url of the method
 */
export var POST = methodBuilder(RequestMethods.Post);
/**
 * PUT method
 * @param {string} url - resource url of the method
 */
export var PUT = methodBuilder(RequestMethods.Put);
/**
 * DELETE method
 * @param {string} url - resource url of the method
 */
export var DELETE = methodBuilder(RequestMethods.Delete);
