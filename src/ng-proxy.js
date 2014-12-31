/**
 * Created by liwei_000 on 2014/12/17.
 */
(function () {
    var services;
    services = angular.module('ng-proxy', []);
    services.factory('$proxy', function ($http) {
        var DataProxy, Proxy;
        Proxy = (function () {
            function Proxy(options) {
                this._opt = options;
            }

            Proxy.prototype = {
                request: function (params, query, callback, errCallback) {
                    var _ref;
                    if (this._opt.type === 'hsf' || this._opt.type === 'mysql') {
                        params = {
                            args: JSON.stringify(params)
                        };
                    }
                    return $http({
                        method: this._opt.method,
                        url: this._opt.bypass ? this._opt.url + ((_ref = this._opt.url.indexOf('?') === -1) != null ? _ref : {
                            '?': '&'
                        }) + '_version=' + this._opt.version : this.parsePath(Proxy.base + '/' + this._opt.id, query),
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        data: params
                    }).success(callback).error(errCallback);
                    ;
                },
                getOptions: function () {
                    return this._opt;
                },
                parsePath: function (path, query) {
                    if (!path || typeof path !== 'string') return path;
                    if (typeof query !== 'object') return path;
                    path = path + '?';
                    for (var key in query) {
                        path = path + key + "=" + query[key] + '&';
                    }
                    path = path.replace(/&$/, '');
                    return path;
                }
            }

            Proxy.objects = {};

            Proxy.configBase = function (base) {
                var self, xhr;
                if (this.base) {
                    return;
                }
                this.base = (base || '').replace(/\/$/, '');
                self = this;
                xhr = new XMLHttpRequest();
                xhr.onload = function () {
                    var interfaces;
                    if (xhr.readyState === 4) {
                        if (xhr.status === 200) {
                            interfaces = xhr.responseText;
                            return self.config(JSON.parse(interfaces));
                        } else {
                            return console.error(xhr.statusText);
                        }
                    }
                };
                xhr.onerror = function (err) {
                    throw err;
                };
                xhr.open("GET", 'http://localhost:3000/model/$interfaces', false);
                return xhr.send(null);
            };

            Proxy.create = function (id) {
                var options;
                if (this.objects[id]) {
                    return this.objects[id];
                }
                options = this._interfaces[id];
                if (!options) {
                    throw new Error('No such interface id defined: ', +id + ', please check your interface configuration file');
                }
                return this.objects[id] = new this(options);
            };

            Proxy.config = function (interfaces) {
                JSON.stringify(interfaces);
                return this._interfaces = interfaces;
            };

            Proxy.getInterfaceIdsByPrefix = function (pattern) {
                var id, ids, len, map;
                if (!pattern) {
                    return [];
                }
                ids = [];
                map = this._interfaces;
                console.log(map);
                len = pattern.length;
                for (id in map) {
                    if (id.slice(0, len) === pattern) {
                        ids.push(id);
                    }
                }
                return ids;
            };

            return Proxy;

        })();
        DataProxy = (function () {
            function DataProxy(profile) {
                var id, method, methodName, prof;
                console.log(typeof profile);
                if (!profile) {
                    return;
                }
                if ((typeof profile) === 'string') {
                    if (/^(\w+\.)+\*$/.test(profile)) {
                        console.log('here');
                        profile = Proxy.getInterfaceIdsByPrefix(profile.replace(/\*$/, ''));
                    } else {
                        profile = [profile];
                    }
                }
                if (profile instanceof Array) {
                    prof = {};
                    methodName;
                    for (id in profile) {
                        methodName = profile[id];
                        methodName = methodName.substring(methodName.lastIndexOf('.') + 1);
                        if (!prof[methodName]) {
                            prof[methodName] = profile[id];
                        } else {
                            methodName = profile[i].replace(/\./g, '_');
                            prof[methodName] = profile[id];
                        }
                    }
                    profile = prof;
                }
                for (method in profile) {
                    this[method] = (function (methodName, interfaceId) {
                        var proxy;
                        proxy = Proxy.create(interfaceId);
                        return function (params, query) {
                            console.log(params)
                            params = params || {};
                            if (!this._queue) {
                                this._queue = [];
                            }
                            this._queue.push({
                                params: params,
                                query: query,
                                proxy: proxy
                            });
                            return this;
                        };
                    })(method, profile[method]);
                }
            }

            DataProxy.prototype = {
                done: function (f, ef) {
                    if (typeof f !== 'function') {
                        return;
                    }
                    if (!this._queue) {
                        f.apply(this);
                        return;
                    }
                    this._sendRequestsParallel(this._queue, f, ef);
                    this._queue = null;
                    return this;
                },
                _sendRequestsParallel: function (queue, callback, errCallback) {
                    var args, cnt, i, self, _i, _ref, _results, _test;
                    args = [];
                    self = this;
                    cnt = queue.length;
                    _results = [];
                    for (var i = 0; i < queue.length; i++) {
                        (function (reqObj, k) {
                            return reqObj.proxy.request(reqObj.params, reqObj.query, function (data) {
                                args[k] = data;
                                return --cnt || callback.apply(self, args);
                            }, function (err) {
                                errCallback = errCallback || self._errCallback;
                                if (typeof errCallback === 'function') {
                                    return errCallback(err);
                                } else {
                                    return console.error('Error occured when sending request =', reqObj.proxy.getOptions(), '\nCaused by:\n', err);
                                }
                            });
                        })(queue[i], i);
                    }
                },
                error: function (f) {
                    return this._errCallback = f;
                },
                fail: function (f) {
                    return this._errCallback = f;
                }
            };

            DataProxy.create = function (profile) {
                return new this(profile);
            };

            DataProxy.configBase = function (path) {
                return Proxy.configBase(path);
            };

            return DataProxy;

        })();
        return DataProxy;
    });
}).call(this)