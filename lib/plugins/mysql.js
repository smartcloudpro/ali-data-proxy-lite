var util = require( 'util' );
var qs = require( 'querystring' );

var ProxyBase = require( '../proxybase' );
var Constant = require( '../constant' );

var mysql = require( 'mysql' );
var util = require( 'util' );
var ProxyBase = require( '../proxybase' );

// Default mysql config
var mysqlConfig = {
    pools: {},
    defaultPool: '',
};

var poolCluster;

function MysqlProxy( options ) {
    options.poolName = options.poolName || mysqlConfig.defaultPool;

    if ( !mysqlConfig.pools[ options.poolName ] ) {
        throw new Error( 'Profile is deprecated because no pool can be used by interface '
            + options.id );
    }

    this._opt = options;
}

util.inherits( MysqlProxy, ProxyBase );

// @override
MysqlProxy.prototype.requestReal = function( params, callback, errCallback ) {
    var self = this;
    poolCluster.getConnection( self._opt.poolName, function( err, connection ) {
        if ( err ) {
            err.message = 'Error occured when getting connection from pool. interface id = ' 
                + self._opt.id + '. Caused by: ' + err.message;
            connection.release();
            errCallback( err );
            return;
        }
        connection.query( self._opt.sql, params, function( err, result, fields ) {
            if ( err ) {
                err.message = 'Error occured when querying data. interface id = ' 
                    + self._opt.id + '. Caused by:\n' + err.message;
                errCallback( err );
                connection.release();
                return;
            }
            callback( result, fields );
            connection.release();
        } );
    } );
};

// @override
MysqlProxy.prototype.interceptRequestReal = function( req, res ) {
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
        poolCluster.getConnection( self._opt.poolName, function( err, connection ) {
            if ( err ) {
                var message = 'Error occured when getting connection from pool. interface id = ' 
                    + self._opt.id + '. Caused by: ' + err.message;
                res.statusCode = 500;
                res.end( message );
                return;
            }
            connection.query( self._opt.sql, args, function( err, result, fields ) {
                if ( err ) {
                    var message = 'Error occured when querying data. interface id = ' 
                        + self._opt.id + '. Caused by:\n' + err.message;
                    res.statusCode = 500;
                    res.end( message );
                    connection.release();
                    return;
                }
                try {
                    var serialized = JSON.stringify( result );
                    res.end( serialized );
                } catch ( e ) {
                    res.statusCode = 500;
                    res.end( 'Can not serialize the result. interface id =' 
                        + self._opt.id + ' Caused By: ' + e );
                }
                connection.release();
            } );
        } );
    } );
};

// @override
MysqlProxy.init = function( config ) {
    var mysqlCfg = config.mysql;
    if ( !mysqlCfg ) {
        throw new Error( 'No configuration for mysql' );
    }

    // add pools
    var pools = mysqlCfg.pools || {};
    poolCluster = mysql.createPoolCluster();
    for ( var i in pools ) {
        var cfg = pools[ i ];
        cfg.insecureAuth = cfg.insecureAuth || true;
        poolCluster.add( i, cfg );
    }

    mysqlConfig.pools = pools;
    mysqlConfig.defaultPool = mysqlCfg.defaultPool;
};

// @override
MysqlProxy.verify = function( options, InterfaceManager ) {
    if ( !options.sql ) {
        throw new Error( 'Profile is deprecated because no sql can be executed by interface ' + options.id );
    }
    options.method = options.method || Constant.GET;
    options.status = options.status || InterfaceManager.getStatus();
    return options;
};

module.exports = MysqlProxy;