/** 
 * DataProxy
 * @author ShanFan
 * @created 24-3-2014
 **/

// Dependencies
var ProxyFactory = require( './proxyfactory' );
var Constant = require( './constant' );

var logger = console;

/**
 * DataProxy Constructor
 * @param {Object|Array|String} profile. This profile describes what the proxy looks
 * like. eg:
 * profile = {
 *    getItems: 'Search.getItems',
 *    getCart: 'Cart.getCart'
 * }
 * profile = ['Search.getItems', 'Cart.getCart']
 * profile = 'Search.getItems'
 * profile = 'Search.*'
 */
function DataProxy( profile ) {
    if ( !profile ) return;

    if ( typeof profile === 'string' ) {

        // Get ids via prefix pattern like 'packageName.*'
        if ( /^(\w+\.)+\*$/.test( profile ) ) {
            profile = ProxyFactory
                .getInterfaceIdsByPrefix( profile.replace( /\*$/, '' ) );

        } else {
            profile = [ profile ];
        }
    }
    if ( profile instanceof Array ) {
        var prof = {}, methodName;
        for ( var i = profile.length - 1; i >= 0; i-- ) {
            methodName = profile[ i ];
            methodName = methodName
                            .substring( methodName.lastIndexOf( '.' ) + 1 );
            if ( !prof[ methodName ] ) {
                prof[ methodName ] = profile[ i ];

            // The method name is duplicated, so the full interface id is set
            // as the method name.
            } else {
                methodName = profile[ i ].replace( /\./g, '_' );
                prof[ methodName ] = profile[ i ]; 
            }
        }
        profile = prof;
    }
    
    // Construct the proxy following the profile
    for ( var method in profile ) {
        this[ method ] = ( function( methodName, interfaceId ) {
            var proxy = ProxyFactory.create( interfaceId );
            return function( params ) {
                params = params || {};

                if ( !this._queue ) {
                    this._queue = [];
                }
                // Push this method call into request queue. Once the done method
                // is called, all requests in this queue will be sent.
                this._queue.push( {
                    params: params,
                    proxy: proxy
                } );
                return this;
            };
        } )( method, profile[ method ] );
    }
}

DataProxy.prototype = {
    done: function( f, ef ) {
        if ( typeof f !== 'function' ) return;

        // No request pushed in _queue, so callback directly and return.
        if ( !this._queue ) {
            f.apply( this );
            return;
        }

        // Send requests parallel
        this._sendRequests( this._queue, f, ef );

        // Clear queue
        this._queue = null;
        return this;
    },
    withCookie: function( cookie ) {
        this._cookies = cookie;
        return this;
    },
    rewriteCookie: function( f ) {
        this._rewriteCookieFunc = f;
    },
    _sendRequests: function( queue, callback, errCallback ) {
        // The final data array
        var args = [], setcookies = [], self = this;

        // Count the number of callback;
        var cnt = queue.length;
 
        // Send each request
        for ( var i = 0; i < queue.length; i++ ) {
            ( function( reqObj, k, cookie ) {
                
                reqObj.proxy.request( reqObj.params, function( data, setcookie ) {
                    // fill data for callback
                    args[ k ] = data;

                    // concat setcookie for cookie rewriting
                    setcookies = setcookies.concat( setcookie );
                    // args.push( setcookies );

                    try {
                        --cnt;
                        if ( cnt === 0 ) {
                            // rewrite cookie.
                            if ( self._rewriteCookieFunc ) {
                                typeof self._rewriteCookieFunc === 'function'
                                    // if func, call it to rewrite
                                    ? self._rewriteCookieFunc( setcookies )
                                    // else treat it as HttpResponse Object and rewrite cookie directly.
                                    : self._rewriteCookieFunc.setHeader( 'Set-Cookie', cookies );
                                
                                // clear
                                self._rewriteCookieFunc = null;
                            }
                            // push the set-cookies as the last parameter for the callback function.
                            args.push( setcookies );
                            callback.apply( self, args );
                        }
                    } catch ( e ) {
                        errCallback = errCallback || self._errCallback;
                        if ( typeof errCallback === 'function' ) {
                            e.statusCode = -1;
                            errCallback( e );
                        } else {
                            logger.error( e );
                        }
                    }

                }, function( err ) {
                    errCallback = errCallback || self._errCallback;
                    if ( typeof errCallback === 'function' ) {
                        errCallback( err );
                        
                    } else {
                        logger.error( 'Error occured when sending request ='
                            , reqObj.params, '\nCaused by:\n', err );
                    }
                }, cookie ); // request with cookie.

            } )( queue[i], i, self._cookies );
        }
        // clear cookie of this request.
        self._cookies = undefined;
    },
    error: function( f ) {
        this._errCallback = f;
    },
    fail: function( f ) {
        this._errCallback = f;
    }
};

/**
 * DataProxy.init
 * @param {String|Object} path The path refers to the interface configuration file
 */
DataProxy.init = function( path ) {
    if ( typeof path === 'string' ) {
        ProxyFactory.init( path );
        return;
    }

    if ( !path.interfaceConfig ) {
        throw new Error( 'DataProxy can not be initialized without config path!' );
    }

    if ( path.mock === true ) {
        path.interfaceConfig.status = Constant.STATUS_MOCK;
    } else if ( path.mockerr === true ) {
        path.interfaceConfig.status = Constant.STATUS_MOCK_ERR;
    }
    
    ProxyFactory.init( path.interfaceConfig );
};

DataProxy.create = function( profile ) {
    return new this( profile );
};

DataProxy.Interceptor = function( req, res ) {
    ProxyFactory.interceptRequest( req, res );
};

DataProxy.setLogger = function( l ) {
    logger = l;
    ProxyFactory.setLogger( l );
};

module.exports = DataProxy;
