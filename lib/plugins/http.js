/**
 * Http Proxy Class
 */

var util = require('util')
    , fs = require('fs')
    , url = require('url')
    , qs = require('querystring')
    , http = require('http')
    , iconv = require('iconv-lite')
    , Agent = require('agentkeepalive')
    , Constant = require('../constant');

// Agent will be initialized when HttpProxy.init is call
var keepAliveAgent;

var ProxyBase = require('../proxybase');

var httpConfig = {};

// HttpProxy Constructor
function HttpProxy(options) {
    this._opt = options || {};

    var urls = this._opt.urls || {};

    if (this._opt.status === Constant.STATUS_MOCK
        || this._opt.status === Constant.STATUS_MOCK_ERR) {
        return;
    }
    var currUrl = urls[this._opt.status];

    if (!currUrl) {
        throw new Error('No url can be proxied! InterfaceId = ' + options.id);
    }
    this._opt.currUrl = currUrl;
    var urlObj = url.parse(currUrl);
    this._opt.hostname = urlObj.hostname;
    this._opt.port = urlObj.port || 80;
    if (typeof urlObj.path !== 'string') {
        throw new Error('Url is unavailable! InterfaceId = ' + options.id);
    }
    this._opt.path = urlObj.path
    + ( urlObj.path.indexOf('?') !== -1 ? '&' : '?' )
    + '_version=' + this._opt.version + '&';
}

// Inherits ProxyBase
util.inherits(HttpProxy, ProxyBase);

// @override requestReal function of ProxyBase which is defined in proxybase.js
HttpProxy.prototype.requestReal = function (params, callback, errCallback, cookie) {
    if (this._opt.isCookieNeeded === true && cookie === undefined) {
        errCallback(new Error('This request need cookie, you must set a cookie for'
        + ' it before request. interfaceId = ' + this._opt.id));
        return;
    }

    var self = this, isCompleted = false;
    var rid = new Date().getTime() + '' + Math.round(Math.random() * 1000);

    var options = {
        hostname: self._opt.hostname,
        port: self._opt.port,
        path: self._parsePath(self._opt.path, params) + '_rid=' + rid + '&',
        method: self._opt.method,
        headers: {'Cookie': cookie},
        agent: keepAliveAgent,
        keepAlive: true
    };

    var querystring;

    if (self._opt.method === Constant.POST || self._opt.method === Constant.PUT) {
        if (self._opt.contentType && self._opt.contentType === 'application/json') {
            options.headers['Content-Type'] = Constant.MediaType.APPLICATION_JSON;
            querystring = JSON.stringify(params);
            console.log('path:' + options.path)
        } else {
            options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
            querystring = self._queryStringify(params)
        }
        options.headers['Content-Length'] = querystring.length;

    } else if (self._opt.method === Constant.GET) {
        querystring = self._queryStringify(params);
        options.path += querystring;
    }
    var timer = setTimeout(function () {
        if (req) {
            req.abort();
        }
        var e = new Error('Timeout. rid = ' + rid
        + ', interfaceId = ' + self._opt.id
        + ', url = ' + self._opt.currUrl);
        errCallback(e);
        isCompleted = true;
    }, self._opt.timeout);

    var req = http.request(options, function (res) {
        if (isCompleted) return;
        var source = [], size = 0;
        res.on('data', function (chunk) {
            source.push(chunk);
            size += chunk.length;
        });
        res.on('end', function () {
            clearTimeout(timer);
            var buffer = Buffer.concat(source, size);
            if (res.statusCode !== 200 && res.statusCode !== 201 && res.statusCode !== 202) {
                var e = new Error('Response error. rid = ' + rid
                + ', interfaceId = ' + self._opt.id
                + ', url = ' + self._opt.currUrl
                + ', statusCode = ' + res.statusCode);
                e.statusCode = res.statusCode;
                e.responseText = buffer.toString();
                ( isCompleted = true ) && errCallback(e);
                return;
            }
            try {
                var result = self._opt.encoding === Constant.ENCODING_RAW
                    ? buffer
                    : ( self._opt.dataType !== Constant.JSON && self._opt.dataType !== Constant.JSONP
                    ? iconv.fromEncoding(buffer, self._opt.encoding)
                    : JSON.parse(iconv.fromEncoding(buffer, self._opt.encoding)) );
            } catch (e) {
                errCallback(new Error('The result has syntax error. interfaceId = '
                + self._opt.id + ', url = ' + self._opt.currUrl + '. Caused By: ' + e.message));
                return;
            }

            isCompleted || callback(result, res.headers['set-cookie']);
            isCompleted = true;
        });

        res.on('error', function (e) {
            if (isCompleted) return;
            clearTimeout(timer);
            e.message = 'Response failed. rid = ' + rid + ', interfaceId = ' + self._opt.id + ', url = '
            + self._opt.currUrl + '. Caused By: ' + e.message + ' code = ' + e.code;
            errCallback(e);
            isCompleted = true;
        });
    });
    if (self._opt.method === Constant.POST || self._opt.method === Constant.PUT) {
        req.write(querystring);
    }
    req.on('error', function (e) {
        if (isCompleted) return;
        clearTimeout(timer);
        e.message = 'Request failed. rid = ' + rid + ',interfaceId = ' + self._opt.id + ', url = '
        + self._opt.currUrl + '. Caused By: ' + e.message;
        errCallback(e);
        isCompleted = true;
    });

    req.end();
};

// @override interceptRequestReal function of ProxyBase which is defined in proxybase.js
HttpProxy.prototype.interceptRequestReal = function (req, res) {
    var qstr = req.url.replace(/^[^\?]*\??/, '');
    var params = '';
    var body;
    params = qs.parse(qstr);
    var self = this;
    var options = {
        hostname: self._opt.hostname,
        port: self._opt.port,
        path: self._parsePath(self._opt.path, params) + req.url.replace(/^[^\?]*\??/, ''),
        method: self._opt.method,
        headers: req.headers,
        agent: keepAliveAgent,
        keepAlive: true
    };

    options.headers.host = self._opt.hostname;
    // console.log( 'url2:\n', options.hostname + options.path );
    // delete options.headers.referer;
    // delete options.headers['x-requested-with'];
    // delete options.headers['connection'];
    // delete options.headers['accept'];
    delete options.headers['accept-encoding'];

    var req2 = http.request(options, function (res2) {
        var source = [], size = 0;

        res2.on('data', function (chunk) {
            source.push(chunk);
            size += chunk.length;
        });

        res2.on('end', function () {
            var buffer = Buffer.concat(source, size);
            var result;
            try {
                result = self._opt.encoding === Constant.ENCODING_RAW
                    ? buffer
                    : iconv.fromEncoding(buffer, self._opt.encoding);
            } catch (e) {
                res.statusCode = 500;
                res.end(e + '');
                return;
            }
            res.setHeader('Set-Cookie', res2.headers['set-cookie']);
            res.statusCode = res2.statusCode;
            res.setHeader('Content-Type', res2.headers['Content-Type']);
            res.end(result);
        });
        res2.on('error', function (err) {
            res.statusCode = 500;
            res.end(e + '');
        });
    });

    req2.on('error', function (e) {
        res.statusCode = 500;
        res.end(e + '');
    });
    req.on('data', function (chunck) {
        console.log(chunck.toString())
        req2.write(chunck);
    });
    req.on('end', function () {
        req2.end();
    });
};

HttpProxy.prototype._queryStringify = function (params) {
    if (!params || typeof params === 'string') {
        return params || '';
    } else if (params instanceof Array) {
        return params.join('&');
    }
    var qs = [], val;
    for (var i in params) {
        try {
            // to avoid circle reference of json
            val = typeof params[i] === 'object'
                ? JSON.stringify(params[i])
                : params[i];
        } catch (e) {
            val = params[i];
        }
        try {
            //  to avoid URIError: malformed URI sequence
            qs.push(i + '=' + encodeURIComponent(val));
        } catch (e) {
            console.log(new Date().toLocaleString()
            + '- URIError: malformed string = ' + val
            + ', from = ' + i
            + ', interfaceId = ' + this._opt.id
            + ', url = ' + this._opt.currUrl);

            qs.push(i + '=' + val);
        }
    }
    return qs.join('&');
};

/**
 * {Function}_parsePath
 * eg:
 * path = 'projects/:id/files/:name-:number?p1=vala&p2=:val'
 * params = {id:12345, name:'zyz', number:678, val:valb}
 * result => 'projects/12345/files/zyz-678?p1=vala&p2=valb'
 */
HttpProxy.prototype._parsePath = function (path, params) {
    if (!path || typeof path !== 'string') return path;
    if (typeof params !== 'object') return path;
    return path.replace(/\:\w+/g, function (s) {
        var key =  s.substring(1);
        var value =  params[key];
        delete params[key];
        return value;
    });
};

/**
 * {Function} init, will be called when the interface.json is loaded.
 * @param {Object} config The config of interface.json.
 */
HttpProxy.init = function (config) {
    httpConfig = config.http || {};
    keepAliveAgent = new Agent({
        maxSockets: httpConfig.maxSockets || 1000,
        keepAlive: true,
        keepAliveMsecs: httpConfig.keepAliveMsecs || 3000
    });
};

/**
 * {Function} verify will be called when the InterfaceManager is adding http interface profile and need
 * corresponding interface proxy implementer to verify whether the profile is valid.
 * @param {Object} prof The profile to be verified.
 * @param {Object} InterfaceManager This Object provides some useful methods to get some global
 * configuration such as getStatus so that some value of profile can be set as default.
 * @return {Object} prof The verified profile object.
 */
HttpProxy.verify = function (prof, InterfaceManager) {
    if (!(prof.status in prof.urls
        || prof.status === Constant.STATUS_MOCK
        || prof.status === Constant.STATUS_MOCK_ERR )) {
        prof.status = InterfaceManager.getStatus();
    }

    function isUrlsValid(urls) {
        if (!urls) return false;
        for (var i in urls) {
            return true;
        }
        return false;
    }

    if (!isUrlsValid(prof.urls)
        && !fs.existsSync(prof.ruleFile)) {
        throw new Error('Profile is deprecated:\n',
            prof, '\nNo urls is configured and No ruleFile is available');
    }

    prof.engine = prof.engine || InterfaceManager.getEngine();
    prof.method = {POST: 'POST', GET: 'GET', PUT: 'PUT'}
        [(prof.method || 'GET').toUpperCase()];
    prof.dataType = {json: 'json', text: 'text', jsonp: 'jsonp'}
        [(prof.dataType || 'json').toLowerCase()];
    prof.isRuleStatic = !!prof.isRuleStatic || false;
    prof.isCookieNeeded = !!prof.isCookieNeeded || false;
    prof.timeout = prof.timeout || httpConfig.keepAliveMsecs || 5000;
    prof.version = prof.version || '';
    prof.bypass = !!prof.bypassProxyOnClient;
    prof.url = ( prof.status !== Constant.STATUS_MOCK
    && prof.status !== Constant.STATUS_MOCK_ERR )
        ? prof.urls[prof.status] : '';

    if (prof.status === Constant.STATUS_MOCK || prof.status === Constant.STATUS_MOCK_ERR) {
        prof.bypass = false;
        // prof.dataType = prof.dataType === Constant.JSONP ? Constant.JSON : Constant.TEXT;
    }

    return prof;
};

module.exports = HttpProxy;