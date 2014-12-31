/**
 * Proxy Base Class
 */

// Constant
var Constant = require( './constant' );
var querystring = require( 'querystring' );

function Proxy( options ) {
    this._opt = options || {};
}

Proxy.prototype = {

    request: function( params, callback, errCallback, cookie ) {
        if ( this._opt.status === Constant.STATUS_MOCK 
                || this._opt.status === Constant.STATUS_MOCK_ERR ) {
            this.requestMock( params, callback, errCallback, cookie );
            return;
        }
        this.requestReal( params, callback, errCallback, cookie );
    },

    // should be overridden
    requestReal: function( params, callback, errCallback, cookie ) {
        callback( 'Hello ModelProxy!' );
    },

    // can be overridden
    requestMock: function( params, callback, errCallback, cookie ) {
        try {
            if ( this._opt.isRuleStatic ) {
                callback( this._opt.status === Constant.STATUS_MOCK
                    ? this._opt.rule.response
                    : this._opt.rule.responseError );
                return;
            }
            var engine = this.getMockEngine();
            var data = engine.mock( this._opt.rule
                , this._opt.status === Constant.STATUS_MOCK 
                    ? Constant.RESPONSE : Constant.RESPONSE_ERROR );
            callback( data );
        } catch ( e ) {
            var self = this;
            setTimeout( function() {
                errCallback( 'Mock error. Interface id = '
                    + self._opt.id + ', rule file path = '
                    + self._opt.ruleFile + ', Caused by: ' + e );
            }, 1 );
        }
    },
    getOption: function( name ) {
        return this._opt[ name ];
    },

    interceptRequest: function( req, res ) {
        if ( this._opt.status === Constant.STATUS_MOCK 
                || this._opt.status === Constant.STATUS_MOCK_ERR ) {
            this.interceptRequestMock( req, res );
            return;
        }
        this.interceptRequestReal( req, res );
    },
    // should be overridden
    interceptRequestReal: function( req, res ) {
        res.end( 'Hello ModelProxy!' );
    },
    // can be overridden
    interceptRequestMock: function( req, res ) {
        var self = this, args, buf = [], size = 0, params;
        
        req.on( 'data', function( chunck ) {
            buf.push( chunck );
            size += chunck.length;
        } );

        req.on( 'end', function() {
            if ( self._opt.method === Constant.POST ) {
                var postData = Buffer.concat( buf, size );
                params = qs.parse( postData.toString() );
            } else {
                params = qs.parse( req.url.split( '?' )[1] || '' );
            }

            self.requestMock( params, function( data ) {
                res.end( JSON.stringify( data ) );
            }, function( e ) {
                res.statusCode = 500;
                res.end( 'Error occurred when mocking data.' );
            } );
        } );
    },
    // could be overridden
    getMockEngine: function() {
        var name = this._opt.engine;
        var engine = require( name );
        return {
            mock: function( rule, responseType ) {
                if ( name === 'ali-data-mock' || name === 'river-mock' ) {
                    return engine.spec2mock( rule, responseType );

                } else if ( name === 'mockjs' ) {
                    return engine.mock( rule[responseType] );
                }
            }
        };
    }
};

module.exports = Proxy;