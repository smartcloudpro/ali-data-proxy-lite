/**
 * Mtop Proxy Class
 */
var util = require( 'util' );
var HttpProxy = require( './http' );
var Constant = require( '../constant' );
var qs = require( 'querystring' );

// Default Mtop Configuration
var mtopCofig = {
    urls: {
        prod: 'http://api.m.taobao.com/rest/h5ApiUpdate.do',
        prep: 'http://api.wapa.taobao.com/rest/h5ApiUpdate.do',
        daily: 'http://api.waptest.taobao.com/rest/h5ApiUpdate.do'
    },
    tokenName: '_m_h5_tk',
    appKey: '12574478',
    appKeys: {
        prod: '12574478',
        prep: '12574478',
        daily: '4272'
    }
};

// The pattern to match token in cookie that it will be initialized when MtopProxy.init is called;
var tokenPattern;

// MtopProxy Constructor
function MtopProxy( options ) {
    HttpProxy.call( this, options );
};

// Inherits HttpProxy
util.inherits( MtopProxy, HttpProxy );

// @override requestReal function of HttpProxy which is defined in http.js
MtopProxy.prototype.requestReal = function( params, callback, errCallback, cookie ) {
    params = {
        api: this._opt.api,
        v: this._opt.v,
        data: JSON.stringify( params || {} ),
        appKey: this._opt.appKey,
        t: new Date().getTime()
    };
    params = this._sign( params, cookie );

    return this._opt.dataOnly === false

        ? MtopProxy.super_.prototype.requestReal
            .call( this, params, callback, errCallback, cookie )

        : MtopProxy.super_.prototype.requestReal
            .call( this, params, function( result ) {
                if ( result.retType === 0 ) {
                    callback( result );
                } else {
                    var err = new Error( result.ret[0] 
                        + '\nresponseText: ' + JSON.stringify( result ) );
                    err.code = result.ret[0].split( '::' )[0];
                    errCallback( err );
                }
            }, errCallback, cookie );
};

// @override interceptRequest function of HttpProxy which is defined in http.js
MtopProxy.prototype.interceptRequestReal = function( req, res ) {
    var params = {
        api: this._opt.api,
        v: this._opt.v,
        data:   JSON.stringify( qs.parse( req.url.replace( /^[^\?]*\??/, '' ) ) ),
        appKey: this._opt.appKey,
        t: new Date().getTime()
    };

    // sign
    params = this._sign( params, req.headers.cookie );

    // rewirte url to follow mtop protocol
    req.url = req.url.split('?' )[0] + '?' + this._queryStringify( params );

    // call super to intercept this request
    MtopProxy.super_.prototype.interceptRequestReal.call( this, req, res );
};

MtopProxy.prototype._sign = function( params, cookie ) {
    // get token
    var matched = tokenPattern.exec( cookie );
    var token = ( matched ? matched[ 1 ] : '' ).split( '_' )[ 0 ];

    // signature
    var hash = require( 'crypto' ).createHash( 'md5' );
    params.sign = hash.update( token 
                    + '&' + params.t 
                    + '&' + params.appKey 
                    + '&' + params.data )
                    .digest( 'hex' );

    return params;
};

// init
MtopProxy.init = function( config ) {
    var conf = config.mtop || {};

    mtopCofig.urls =  conf.urls || mtopCofig.urls;

    mtopCofig.tokenName = conf.tokenName || mtopCofig.tokenName;

    mtopCofig.appKeys = conf.appKeys || mtopCofig.appKeys;

    tokenPattern = new RegExp( '(?:^|;\\s*)' + mtopCofig.tokenName + '\\=([^;]+)(?:;\\s*|$)' );
};

// verify
MtopProxy.verify = function( options, InterfaceManager ) {
    if ( !options.api ) {
        throw new Error( 'API name must be specified for mtop interface.' );
    }

    options.v = options.version || '1.0';

    options.urls = mtopCofig.urls;

    options.dataType = Constant.JSON;

    options.dataOnly = options.dataOnly || false;

    options.isCookieNeeded = true;

    options.method = Constant.GET;

    options.appKey = mtopCofig.appKeys[ options.status || InterfaceManager.getStatus() ] || mtopCofig.appKey; 

    return MtopProxy.super_.verify.call( this, options, InterfaceManager );
};

module.exports = MtopProxy;