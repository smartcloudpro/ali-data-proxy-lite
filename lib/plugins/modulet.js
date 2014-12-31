/**
 * Modulet Proxy Class
 */
var util = require( 'util' );
var HttpProxy = require( './http' );
var Constant = require( '../constant' );

// Default modulet Configuration
var moduletConfig = {
    urls: {
        prod: 'http://i.daily.taobao.net/module.do',
        prep: 'http://i.daily.taobao.net/module.do',
        daily: 'http://i.daily.taobao.net/module.do'
    }
};

// ModuletProxy Constructor
function ModuletProxy( options ) {
    HttpProxy.call( this, options );
};

// Inherits HttpProxy
util.inherits( ModuletProxy, HttpProxy );

// @override requestReal function of HttpProxy which is defined in http.js
ModuletProxy.prototype.requestReal = function( params, callback, errCallback, cookie ) {
    var params = {
        name: this._opt.moduletName.join( ',' ),
        data: JSON.stringify( params || {} )
    };
    var self = this;
    return self._opt.dataOnly === false && self._opt.moduletName.length === 1

        ? ModuletProxy.super_.prototype.requestReal
            .call( self, params, callback, errCallback, cookie )

        : ModuletProxy.super_.prototype.requestReal
            .call( self, params, function( result ) {
                result = result[ self._opt.moduletName[0] ];
                if ( result.ret === 200 ) {
                    callback( result.data );
                    return;
                }
                var err = new Error( result.msg );
                err.statusCode = result.ret;
                errCallback( err );
            }, errCallback, cookie );
};

// @override interceptRequest function of HttpProxy which is defined in http.js
ModuletProxy.prototype.interceptRequestReal = function( req, res ) {
    var params = {
        name: this._opt.moduletName.join( ',' ),
        data: JSON.stringify( params || {} )
    };

    // rewirte url to follow modulet protocol
    req.url = req.url.split('?' )[0] + '?' + this._queryStringify( params );

    // call super to intercept this request
    ModuletProxy.super_.prototype.interceptRequestReal.call( this, req, res );
};

// init
ModuletProxy.init = function( config ) {
    var conf = config.modulet || {};
    moduletConfig.urls =  conf.urls || moduletConfig.urls;
};

// verify
ModuletProxy.verify = function( options, InterfaceManager ) {
    if ( !options.moduletName ) {
        throw new Error( 'Modulet name must be specified for modulet interface. interfaceId = ' + options.id );
    }

    options.moduletName = options.moduletName instanceof Array ? options.moduletName : [ options.moduletName ];

    options.urls = moduletConfig.urls;

    options.dataType = Constant.JSON;

    options.dataOnly = options.dataOnly || false;

    options.isCookieNeeded = options.isCookieNeeded || false;

    options.method = options.method || Constant.GET;

    return ModuletProxy.super_.verify.call( this, options, InterfaceManager );
};

module.exports = ModuletProxy;
