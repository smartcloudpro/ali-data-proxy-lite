var util = require( 'util' );
var ProxyBase = require( '../proxybase' );
var Constant = require( '../constant' );
var hsf = require( 'hsf' );
var qs = require( 'querystring' );

// hsf client reference
var client;

// The options object which will be initialized when the init function is called.
var hsfOptions;

// HsfProxy Constructor
function HsfProxy( options ) {
    this._opt = options;
    // @See Readme.md about the hsf interface configuration
    var opt = {
        group: options.group || 'HSF',
        connectTimeout: options.connectTimeout || 3000 ,
        responseTimeout: options.responseTimeout || 3000,
        keepAlive: options.keepAlive,
        noDelay: options.noDelay
    };
    if ( this._opt.status === Constant.STATUS_MOCK 
        || this._opt.status === Constant.STATUS_MOCK_ERR ) {
        return;
    }

    client = client ? client : hsf.createClient( hsfOptions );

    this._consumer = client.createConsumer( options.service, options.version, opt );
}

// Inherits ProxyBase
util.inherits( HsfProxy, ProxyBase );

// @override requestReal function of ProxyBase which is defined in proxybase.js
HsfProxy.prototype.requestReal = function( params, callback, errCallback ) {

    this._consumer.invoke( this._opt.methodName, params, function( err, data ) {
        if ( err ) {
            errCallback( err );
            return;
        }
        callback( data );
    } );
};

// @override interceptRequest function of ProxyBase which is defined in proxybase.js
HsfProxy.prototype.interceptRequestReal = function( req, res ) {
    var self = this, args, buf = [], size = 0;
    var queryObj = qs.parse( req.url.split( '?' )[1] || '' );
    if ( self._opt.method === Constant.GET ) {
        // This args field in queryObj should be promised by requester.
        args = queryObj.args ? JSON.parse( queryObj.args ) : null ;
    }
    
    req.on( 'data', function( chunck ) {
        buf.push( chunck );
        size += chunck.length;
    } );

    req.on( 'end', function() {
        if ( self._opt.method === Constant.POST ) {
            postData = Buffer.concat( buf, size );
            args = qs.parse( postData.toString() ).args;
            args = args ? JSON.parse( args ) : null;
        }
        self._consumer.invoke( self._opt.methodName, args, function( err , data ) {
            if ( err ) {
                res.statusCode = 500;
                res.end( err + '' );
                return;
            }
            try {
                var serialized = JSON.stringify( data );
                res.end( serialized );
            } catch ( e ) {
                res.statusCode = 500;
                res.end( 'Can not serialize the result. Caused By: ' + e );
            }
        } );
    } );
};

/**
 * {Function} init, will be called when the interface.json is loaded.
 * @param {Object} config The config of interface.json.
 */
HsfProxy.init = function( config ) {
    var hsfConfig = config.hsf || {};
    // @See Readme.md about the hsf configuration
    hsfOptions = {
        configSvr: ( hsfConfig.configServers || {} )[ config.status ],
        connectTimeout: hsfConfig.connectTimeout || 3000,
        responseTimeout: hsfConfig.responseTimeout || 3000,
        routeInterval: hsfConfig.routeInterval || 60000,
        snapshot: hsfConfig.snapshot || true,
        logOff: hsfConfig.logOff || false,
        keepAlive: hsfConfig.keepAlive || true,
        noDelay: hsfConfig.noDelay || true
    };
};

/**
 * {Function} verify will be called when the InterfaceManager is adding hsf interface profile and need
 * corresponding interface proxy implementer to verify whether the profile is valid.
 * @param {Object} prof The profile to be verified.
 * @param {Object} InterfaceManager This Object provides some useful methods to get some global 
 * configuration such as getStatus so that some value of profile can be set as default.
 * @return {Object} prof The verified profile object.
 */
HsfProxy.verify = function( prof, InterfaceManager ) {
    if ( !prof.service ) {
        throw new Error( 'service should not be null' );
    }
    if ( !prof.version ) {
        throw new Error( 'version should not be null' );
    }
    prof.method = prof.method || Constant.GET;
    prof.intercepted = prof.intercepted || true;

    prof.dataType = Constant.JSON; // for client usage.

    prof.status = prof.status || InterfaceManager.getStatus();
    return prof;
};

module.exports = HsfProxy;