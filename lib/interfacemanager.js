/**
 * InterfaceManager
 * This Class is provided to parse the interface configuration file so that
 * the Proxy class can easily access the structure of the configuration.
 * @author ShanFan
 * @created 24-3-2014
 **/

var fs = require( 'fs' );
var Constant = require( './constant' );
var path = require( 'path' );
var traverse = require('traverse');
var logger = console;

var InterfaceManager = {
    /**
     * InterfaceManager.init
     * @param {String|Object} path The file path of inteface configuration or the interface object
     * @param {Object} verifiers The verifier object map. The key is the proxy type, the value is the object
     * which implemented the method verify that is used to verify various type of profile when the interface
     * configuration file is loaded by Interface manager.
     */
    init: function ( path, verifiers ) {
        this._path = typeof path === 'object'
            // if an object is passed in, the field of _originalPath should be promised.
            ? ( path._originalPath || '' )
            : path;
        this._verifiers = verifiers || {};

        // {Object} Interface Mapping, The key is interface id and
        // the value is a json profile for this interface.
        this._interfaceMap = {};

        // {Object} A interface Mapping for client, the key is interface id and
        // the value is a json profile for this interface.
        this._clientInterfaces = {};

        // {String} The path of rulebase where the interface rules is stored. This value will be override
        // if user specified the path of rulebase in interface.json.
        this._rulebase = this._path.replace( /\/[^\/]*$/, '/interfaceRules' );

        typeof path === 'string'
            ? this._loadProfilesFromPath( path )
            : this._loadProfiles( path );
    },
    // @throws errors
    _loadProfilesFromPath: function( path ) {
        logger.info( 'Loading interface profiles.\nPath = ', path );

        try {
            var profiles = fs.readFileSync( path );
        } catch ( e ) {
            throw new Error( 'Fail to load interface profiles.' + e );
        }
        try {
            profiles = JSON.parse( profiles );
        } catch( e ) {
            throw new Error( 'Interface profiles has syntax error:' + e );
        }
        this._loadProfiles( profiles );
    },

    _loadProfiles: function( profiles ) {
        if ( !profiles ) return;
        this._config = profiles;

        logger.info( 'Title: ' + profiles.title + ', Version:' + profiles.version );

        this._rulebase = profiles.rulebase
                       ? path.join( path.dirname( this._rulebase ) , profiles.rulebase )
                       : this._rulebase;
        logger.info( 'interface path:' + this._path );
        logger.info( 'rulebase path:' + this._rulebase );

        // {String} The mock engine name.
        this._engine = profiles.engine || 'mockjs';

        if ( profiles.status === undefined ) {
            throw new Error( 'There is no status specified in interface configuration!' );
        }

        // {String} The interface status in using.
        this._status = profiles.status;

        var interfaces = profiles.interfaces || [];


	    var ims = null;
	    if(profiles.ims && profiles.prj_id && profiles.token && profiles.version){
		    ims = {
			    prj_id: profiles.prj_id,
			    token: profiles.token,
			    version: profiles.version
		    };
	    }

        for ( var i = interfaces.length - 1; i >= 0; i-- ) {
            this._addProfile( interfaces[i], ims)
                && logger.info( 'Interface[' + interfaces[i].id + '] is loaded.' );
        }
    },
    getConfig: function() {
        return this._config;
    },
    getProfile: function( interfaceId ) {
        return this._interfaceMap[ interfaceId ];
    },
    getClientInterfaces: function() {
        return this._clientInterfaces;
    },
    getEngine: function() {
        return this._engine;
    },
    getStatus: function( name ) {
        return this._status;
    },
    // @return Array
    getInterfaceIdsByPrefix: function( pattern ) {
        if ( !pattern ) return [];
        var ids = [], map = this._interfaceMap, len = pattern.length;
        for ( var id in map ) {
            if ( id.slice( 0, len ) == pattern ) {
                ids.push( id );
            }
        }
        return ids;
    },

    isProfileExisted: function( interfaceId ) {
        return !!this._interfaceMap[ interfaceId ];
    },
    _addProfile: function( prof, ims ) {
        if ( !prof || !prof.id ) {
            logger.error( "Can not add interface profile without id!" );
            return false;
        }
        if ( !/^((\w+\.)*\w+)$/.test( prof.id ) ) {
            logger.error( "Invalid id: " + prof.id );
            return false;
        }
        if ( this.isProfileExisted( prof.id ) ) {
            logger.error( "Can not repeat to add interface [" + prof.id
                     + "]! Please check your interface configuration file!" );
            return false;
        }

        prof.ruleFile = this._rulebase + '/'
                         + ( prof.ruleFile || ( prof.id + ".rule.json" ) );

        prof.type = prof.type || 'http';
        var verifier = this._verifiers[ prof.type ];
        if ( verifier && typeof verifier.verify === 'function' ) {
            try {
                prof = verifier.verify( prof, this );
            } catch ( e ) {
                logger.warn( 'The interface profile is invalid.\nprofile = ', prof, '\nreason:\n' + e );
                return false;
            }
        }

        if ( prof.status === Constant.STATUS_MOCK
            || prof.status === Constant.STATUS_MOCK_ERR ) {
            try {
                prof.rule = require( prof.ruleFile );

	            prof.rule = (function(schema, currentPath){
		            var callee = arguments.callee;
		            traverse(schema).forEach(function(value){
			            // { "$ref": "definitions.json#/address" }
						if(this.key == '$ref'){
							var refs = value.split('#'),
								ref_file = refs[0],
								ref_path = refs[1];

							if(ref_file){
								ref_file = require(path.join(currentPath, ref_file));
							}else{
								ref_file = schema;
							}

							if(ref_path){
								if(ref_path[0] == '/'){
									ref_path = ref_path.substr(1);
								}
								ref_path = ref_path.split('/');
							}else{
								ref_path = [];
							}

							var ref_result = traverse(ref_file).get(ref_path);
							if(~JSON.stringify(ref_result).indexOf('$ref')){
								ref_result = callee(ref_result, path.dirname(path.join(currentPath, refs[0])))
							}
							this.parent.update(ref_result, true);
						}
		            });

		            return schema;
	            })(prof.rule, path.dirname(prof.ruleFile));

	            if(ims){
		            var request = require('request');
		            prof.rule.meta =  prof.rule.meta || {};
		            prof.rule.meta.version =  ims.version;
		            prof.rule.meta.id = prof.id;
		            request.post( 'http://ims.alibaba-inc.com/api/ims/add/interface', {
			            form: {
				            prj_id: ims.prj_id,
				            token: ims.token,
				            spec: JSON.stringify(prof.rule)
			            }
		            }, function(err, res, body){
			            console.log(body);
		            });
	            }

            } catch ( e ) {
                throw new Error( 'Can not read rule file of ' + prof.id
                    + ', so deprecated this interface. Caused by:\n', e );
            }
        }

        this._interfaceMap[ prof.id ] = prof;
        this._clientInterfaces[ prof.id ] = {
            type: prof.type,
            id: prof.id,
            method: prof.method,
            dataType: prof.dataType,
            version: prof.version,
            bypass: prof.bypass,
            url: prof.url
        };
        return true;
    },
    addProfile: function( id, prof ) {
        if ( !prof ) {
            prof = id;
            id = prof.id;
        }
        this._interfaceMap[ id ] = prof;
    },
    addClientProfile: function( id, prof ) {
        if ( !prof ) {
            prof = id;
            id = prof.id;
        }
        this._clientInterfaces[ id ] = prof;
    },
    setLogger: function( l ) {
        logger = l;
    }
}

module.exports = InterfaceManager;
