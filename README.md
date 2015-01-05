# ali-data-proxy-lite 1.1.12 (支持rest, modulet, mtop, hsf, mysql)
## Install

```sh
$ npm install ali-data-proxy-lite
```
===

对restfull接口的更好支持:
*1.主要支持了application/json
*2.angular client支持（ng-proxy)

## 目录
 - [Why?]()
   - [工作原理图]() 
 - [使用前必读]()
 - [快速开始]()
   - [用例一 接口文件配置->引入接口配置文件->创建并使用proxy]()
   - [用例二 Proxy多接口配置及合并请求]()
   - [用例三 Proxy混合配置及依赖调用]()
   - [用例四 配置mock代理]()
   - [用例五 使用DataProxy拦截请求]()
   - [用例六 在浏览器端使用DataProxy]()
   - [用例七 代理带cookie的请求并且回写cookie]()
   - [用例八 使用DataProxy代理HSF的consumer功能]()
   - [用例九 使用DataProxy代理Mtop接口]()
   - [用例十 使用DataProxy操作Mysql数据库]()
   - [用例十一 使用DataProxy访问Modulet接口]()
 - [完整实例](demo/)
 - [配置文件详解]()
   - [interface.json 配置]()
   - [http 接口配置]()
   - [mtop 接口配置]()
   - [hsf 接口配置]()
   - [mysql 接口配置]()
 - [API]()
   - [DataProxy对象创建方式]()
   - [创建DataProxy对象时指定的profile相关形式]()
   - [DataProxy logger设置]()
   - [DataProxy对象方法]()
 - [如何使用DataProxy的Mock功能]()
   - [rule.json文件]()
   - [rule.json文件样式]()

## Why?
---
淘系的技术大背景下，必须依赖Java提供稳定的后端接口服务。在这样环境下，Node Server在实际应用中的一个主要作用即是代理(Proxy)功能。由于淘宝业务复杂，后端接口方式多种多样(MTop, Modulet, HSF...)。然而在使用Node开发web应用时，我们希望有一种统一方式访问这些代理资源的基础框架，为开发者屏蔽接口访问差异，同时提供友好简洁的数据接口使用方式。于是就有了 midway-dataproxy 这个构件。使用midway-dataproxy，可以提供如下好处：

1. 不同的开发者对于接口访问代码编写方式统一，含义清晰，降低维护难度。
2. 框架内部采用工厂+单例模式，实现接口一次配置多次复用。并且开发者可以随意定制组装自己的业务Proxy(依赖注入)。
3. 可以非常方便地实现线上，日常，预发环境的切换。
4. 内置[river-mock](http://gitlab.alibaba-inc.com/river/mock/tree/master)等mock引擎，提供mock数据非常方便。
5. 使用接口配置文件，对接口的依赖描述做统一的管理，避免散落在各个代码之中。
6. 支持浏览器端共享Proxy，浏览器端可以使用它做前端数据渲染。整个代理过程对浏览器透明。
7. 接口配置文件本身是结构化的描述文档，可以使用[river](http://gitlab.alibaba-inc.com/river/spec/tree/master)工具集合，自动生成文档。也可使用它做相关自动化接口测试，使整个开发过程形成一个闭环。

### DataProxy工作原理图及相关开发过程图览
---
![](http://img2.tbcdn.cn/L1/461/1/12bb633225499cdbba656335c3ec845dec7a92b4)

## 使用前必读
---
使用DataProxy之前，您需要在工程根目录下创建名为interface.json的配置文件。该文件定义了工程项目中所有需要使用到的接口集合(详细配置说明见后文)。定义之后，您可以在代码中按照需要引入不同的接口，创建与业务相关的Proxy对象。接口的定义和proxy其实是多对多的关系。也即一个接口可以被多个proxy使用，一个proxy可以使用多个接口。具体情况由创建proxy的方式来决定。下面用例中会从易到难指导您如何创建这些proxy。

## 快速开始
---

### 用例一 接口文件配置->引入接口配置文件->创建并使用proxy
* 第一步 配置接口文件命名为：interface_sample.json，并将其放在工程根目录下。
注意：整个项目有且只有一个接口配置文件，其interfaces字段下定义了多个接口。在本例中，仅仅配置了一个主搜接口。

```json
{
    "title": "xxxxx",
    "version": "1.0.0",
    "engine": "mockjs",
    "rulebase": "interfaceRules",
    "status": "prod",
    "enablePlugins": {
        "http": true
    },
    "interfaces": [ {
        "name": "主搜索接口",
        "id": "Search.getItems",
        "urls": {
            "prod": "http://s.m.taobao.com/client/search.do"
        }
    } ]
}
```

* 第二步 在代码中引入DataProxy模块，并且初始化引入接口配置文件（在实际项目中，引入初始化文件动作应伴随工程项目启动时完成，有且只有一次）

```js
// 引入模块
var DataProxy = require( 'dataproxy' ); 

// interface配置文件的绝对路径
var path = require('path').resolve( __dirname, './interface_sample.json' );

// 初始化引入接口配置文件  （注意：初始化工作有且只有一次）
DataProxy.init( path );
```

* 第三步 使用DataProxy

```javascript
// 创建proxy
var searchProxy = new DataProxy( {
    searchItems: 'Search.getItems'  // 自定义方法名: 配置文件中的定义的接口ID
} );
// 或者这样创建: var searchProxy = new DataProxy( 'Search.getItems' ); 此时getItems 会作为方法名

// 使用proxy, 注意: 调用方法所需要的参数即为实际接口所需要的参数。
searchProxy.searchItems( { keyword: 'iphone6' } )
    // !注意 必须调用 done 方法指定回调函数，来取得上面异步调用searchItems获得的数据!
    .done( function( data ) {
        console.log( data );
    } )
    .error( function( err ) {
        console.log( err );
    } );
```

### 用例二 Proxy多接口配置及合并请求
* 配置

```json
{   // 头部配置省略...
    "enablePlugins": {
        "http": true
    },
    "interfaces": [ {
        "name": "主搜索搜索接口",
        "id": "Search.list",
        "urls": {
            "prod": "http://s.m.taobao.com/search.do"
        }
    }, {
        "name": "热词推荐接口",
        "id": "Search.suggest",
        "urls": {
            "prod": "http://suggest.taobao.com/sug"
        }
    }, {
        "name": "导航获取接口",
        "id": "Search.getNav",
        "urls": {
            "prod": "http://s.m.taobao.com/client/search.do"
        }
    } ]
}
```

* 代码

```js
// 更多创建方式，请参考后文API
var proxy = new DataProxy( 'Search.*' );

// 调用自动生成的不同方法
proxy.list( { keyword: 'iphone6' } )
    .done( function( data ) {
        console.log( data );
    } );

proxy.suggest( { q: '女' } )
    .done( function( data ) {
        console.log( data );
    } )
    .error( function( err ) {
        console.log( err );
    } );

// 合并请求
proxy.suggest( { q: '女' } )
    .list( { keyword: 'iphone6' } )
    .getNav( { key: '流行服装' } )
    .done( function( data1, data2, data3 ) {
        // 参数顺序与方法调用顺序一致
        console.log( data1, data2, data3 );
    } );
```

### 用例三 Proxy混合配置及依赖调用

* 配置

```json
{   // 头部配置省略...
    "enablePlugins": {
        "http": true
    },
    "interfaces": [ {
        "name": "用户信息查询接口",
        "id": "Session.getUser",
        "type": "http",
        "urls": {
            "prod": "http://taobao.com/getUser.do"
        }
    }, {
        "name": "订单获取接口",
        "id": "Order.getOrder",
        "type": "http",
        "urls": {
            "prod": "http://taobao.com/getOrder"
        }
    } ]
}
```

* 代码

``` js
var proxy = new DataProxy( {
    getUser: 'Session.getUser',
    getMyOrderList: 'Order.getOrder'
} );
// 先获得用户id，然后再根据id号获得订单列表
proxy.getUser( { sid: 'fdkaldjfgsakls0322yf8' } )
    .done( function( data ) {
        var uid = data.uid;
        this.getMyOrderList( { id: uid } )
            .done( function( data ) {
                console.log( data );
            } )
            .fail( function( err ) {
                console.error( err );
            } );
    } )
    .fail( function( err ) {
        console.error( err );
    } );

```

### 用例四 配置mock代理
* 第一步 在相关接口配置段落中启用mock

```json
{
    "title": "pad淘宝数据接口定义",
    "version": "1.0.0",
    "engine": "river-mock",                       <-- 指定mock引擎
    "rulebase": "interfaceRules",   <-- 指定存放相关mock规则文件的目录名，约定位置与interface.json文件存放在同一目录，默认为 interfaceRules
    "status": "prod",
    "enablePlugins": {
        "http": true
    },
    "interfaces": [ {
        "name": "主搜索接口",
        "id": "Search.getItems",
        "ruleFile": "Search.getItems.rule.json",  <-- 指定数据mock规则文件名，如果不配置，则将默认设置为 id + '.rule.json'
        "urls": {
            "prod": "http://s.m.taobao.com/client/search.do",
            "prep": "http://s.m.taobao.com/client/search.do",
            "daily": "http://daily.taobao.net/client/search.do"
        },
        "status": "mock"                            <-- 启用mock状态，覆盖全局status
    } ]
}
```

* 第二步 添加接口对应的规则文件到ruleBase(interfaceRules)指定的文件夹。mock数据规则请参考[river-mock](http://gitlab.alibaba-inc.com/river/mock/tree/master)和[mockjs](http://mockjs.com)。启动程序后，DataProxy即返回相关mock数据。

### 用例五 使用DataProxy拦截请求

```js
var app = require( 'connect' )();
var DataProxy = require( 'dataproxy' );
var path = require('path').resolve( __dirname, './interface_sample.json' );
DataProxy.init( path );

// 指定需要拦截的路径
app.use( '/proxy', DataProxy.Interceptor );

// 此时可直接通过浏览器访问 /proxy/[interfaceid] 调用相关接口(如果该接口定义中配置了 intercepted = false, 则无法访问)
```

### 用例六 在浏览器端使用DataProxy
* 第一步 按照用例二配置接口文件

* 第二步 按照用例五 启用拦截功能

* 第三步 在浏览器端使用DataProxy

```html
<!-- 引入dataproxy模块，为方便起见直接引入，而非采用KISSY标准包配置引入。但该模块本身是由KISSY封装的标准模块-->
<script src="dataproxy-client.js" ></script>
```

```html
<script type="text/javascript">
    KISSY.use( "dataproxy", function( S, DataProxy ) {
        // !配置基础路径，该路径与第二步中配置的拦截路径一致!
        // 且全局配置有且只有一次！
        DataProxy.configBase( '/proxy/' );

        // 创建proxy
        var searchProxy = DataProxy.create( 'Search.*' );
        searchProxy
            .list( { q: 'ihpone6' } )
            .list( { q: '冲锋衣' } )
            .suggest( { q: 'i' } )
            .getNav( { q: '滑板' } )
            .done( function( data1, data2, data3, data4 ) {
                console.log( {
                    "list_ihpone6": data1,
                    "list_冲锋衣": data2,
                    "suggest_i": data3,
                    "getNav_滑板": data4
                } );
            } )
            .fail( function( err ) {
                console.error( err );
            } );

    } );
</script>
```

### 用例七 代理带cookie的请求并且回写cookie (注：请求是否需要带cookie或者回写取决于接口提供者)

* 关键代码(app 由express创建)

```js
app.get( '/getMycart', function( req, res ) {
    var cookie = req.headers.cookie;
    var cart = DataProxy.create( 'Cart.*' );
    cart.getMyCart()
        // 在调用done之前带上cookie
        .withCookie( cookie )
        // done 回调函数中最后一个参数总是回写的cookie，不需要回写时可以忽略
        .done( function( data , cookies ) {
           res.send( data ); 
        } )
        // 回写cookie
        .rewriteCookie( res ) // <-参数也可以是自定义回写函数，该回写函数的参数即待回写的cookie。见API .rewriteCookie 方法说明。
        .error( function( err ) {
            res.send( 500, err );
        } );
} );
```

### 用例八 使用DataProxy代理HSF的consumer功能

* 第一步，在interface.json文件中配置hsf interface

``` js
{
    "title": "xxxx",
    "version": "1.0.0",                      
    "engine": "river-mock",                  
    "status": "prod",
    "enablePlugins": {
        "hsf": true
    },                        
    "hsf": {                              
        "configServers": {
            "prod": "commonconfig.config-host.taobao.com",
            "daily": "10.232.16.8",          
            "prep": "172.23.226.84"
        }
    },
    "interfaces": [ {
        "type": "hsf",
        "id": "UserService.append",
        "service": "com.taobao.uic.common.service.userdata.UicDataService",
        "methodName": "insertData"
    } ]
}
```

* 第二步，使用DataProxy

```js
var UserService = DataProxy.create( 'UserService.*' );

var user = [];
user.push( require( 'js-to-java' ).Long(456) );
user.push('data-info-userdata');
user.push('gongyangyu');
user.push('langneng');

UserService.append( user )
    .done( function( result ) {
         console.log( result );
    } )
    .error( function( err ) {
         console.log( err );
    } );
```

* `补充说明`：
 - 1. 使用DataProxy调用hsf服务时，其所需要的参数类型及结构由hsf服务提供者决定。当服务提供者使用java发布service时，其参数要求有确定的数据类型，关于java和js之间的数据类型转换，请参考[node-hsf之Java 对象与 Node 的对应关系以及调用方法章节](http://gitlab.alibaba-inc.com/node/node-hsf/tree/master)。推荐使用[js-to-java](https://github.com/node-modules/js-to-java)来辅助编写Java对象。关于hsf的相关说明请参考[HSF项目说明](http://confluence.taobao.ali.com/pages/viewpage.action?pageId=819280)。此外，您可以使用[HSF服务治理](http://ops.jm.taobao.net/service-manager/service_search/index.htm?envType=daily)查询相关服务接口，并且使用[Nexus](http://mvnrepo.taobao.ali.com/nexus/index.html#welcome)查询并获得相关jar包。
 - 2. hsf 的mock方法与其他类型代理无区别，且可以参照例六直接在浏览器端调用hsf service

### 用例九 使用DataProxy代理Mtop接口
* 第一步，在interface.json文件中配置mtop interface

``` js
{
    "title": "pad淘宝项目数据接口集合定义",
    "version": "1.0.0",                      
    "engine": "river-mock",                  
    "status": "prod",
    "enablePlugins": {
        "http": true,
        "mtop": true
    },
    "interfaces":[ {
        "id": "Detail.getTaobaoDyn",
        "version": "1.0",
        "type": "mtop",
        "api": "com.taobao.detail.getTaobaoDyn"
    } ]
}
```

* 第二步，使用DataProxy

```js
var detail = DataProxy.create( 'Detail.*' );
detail.getTaobaoDyn( {'itemNumId': 37194529489} )
    // 在Node端访问Mtop必须带上cookie，cookie一般取自req.headers.cookie 字段
    .withCookie( req.headers.cookie )
    .done( function( data ) {
        console.log( data );
    } ).fail( function( err ) {
        console.log( err );
    } );
```

* `补充说明`：mtop 的mock方法及在浏览器端使用方法与其他无差别。

### 用例十 使用DataProxy操作mysql数据库
* 配置

```js
{
    "title": "xxxx",
    "version": "1.0.0",                      
    "engine": "river-mock",                  
    "status": "prod",
    "enablePlugins": {
        "mysql": true
    },
    "mysql": {
        "pools": {
            "test": {
                "host": "127.0.0.1",
                "port": 3306,
                "user": "user1",
                "database": "testdb",
                "password": "passw0rd",
                "connectionLimit": 100
            }
        },
        "defaultPool": "test"
    },
    "interfaces":[ {
        "id": "UserService.getUser",
        "type": "mysql",
        "sql": "SELECT * FROM USERINFO WHERE ID = ?"
    }, {
        "id": "UserService.addUser",
        "type": "mysql",
        "sql": "INSERT INTO USERINFO VALUES(?, ?, ?, ?)"
    }, {
        "id": "UserService.updateUser",
        "type": "mysql",
        "sql": "UPDATE USERINFO SET ?? = ? WHERE ID = ?"
    } ]
}
```

* 代码

```js
var userService = DataProxy.create( 'UserService.*' );

userService
    .getUser( ['user1'] )
    .addUser( ['user2', '男', '1999-01-01', 'passw0rd'] )
    .updateUser( ['GENDER', '女', 'user3' ] )
    .done( function( result1, result2, result3 ) {
        console.log.( result1, result2, result3 );
    } )
    .fail( function( err ) {
        console.error( err );
    } );
```

### 用例十一 使用DataProxy访问Modulet接口
* 第一步，在interface.json文件中配置modulet interface

``` js
{
    "title": "我的淘宝改版接口定义",
    "version": "1.0.0",                      
    "engine": "river-mock",                  
    "status": "prod",
    "enablePlugins": {
        "http": true,
        "modulet": true
    },
    "modulet": {
        "urls": {
            prod: "http://i.daily.taobao.net/module.do"
        }
    },
    "interfaces":[ {
        "id": "ITaobao.getMyFavourite",
        "version": "1.0",
        "type": "modulet",
        "dataOnly": true,                    // <-- 接口请求成功时，只返回不包含协议信息的数据。
        "moduletName": "favourite"           // <-- 请求的模块名
    } ]
}
```

* 第二步，使用DataProxy

```js
var iTaobao = DataProxy.create( 'ITaobao.*' );
iTaobao.getMyFavourite( {uid: 'xxxx'} )
    .withCookie( req.headers.cookie )
    .done( function( data ) {
        console.log( data );
    } )
    .fail( function( err ) {
        console.log( err );
    } );
```

### 完整实例请查看 [demo](demo/)

## 配置文件详解
---
### interface.json 配置结构

``` js
{
    "title": "xxx数据接口定义",                // [必填][string] 接口文档标题
    "version": "1.0.0",                      // [必填][string] 版本号
    "engine": "river-mock",                  // [选填][string] mock引擎，取值可以是river-mock和mockjs。不需要mock数据时可以不配置
    "rulebase": "interfaceRules",            // [选填][string] mock规则文件夹名称。不需要mock数据时可以不配置。约定该文件夹与
                                             // interface.json配置文件位于同一文件夹。默认为interfaceRules
    "status": "prod",                        // [必填][string] 全局代理状态，取值只能是 interface.urls中出现过的键值或者mock
    "enablePlugins": {                       // [选填][object] 插件启用配置，配置内容与[lib/plugins]所集成的插件一致。注意插件之间的依赖关系
        "http": true,                        // [选填][boolean] 是否启用http代理插件。设置为false时则不会做相应地插件初始化工作。默认false
                                             // 注意：如果禁用http代理会影响其他继承该插件实现的代理，比如mtop
        "mtop": true,                        // 同上
        "modulet": true,                     // 同上
        "mysql": true,                       // 同上
        "hsf": false                         // 同上
    },
    /* http 接口代理配置 */
    "http": { // httpClient 相关配置，不需要是可以不配置，`注意`：该配置项会影响所有其他基于http接口实现的子接口配置效果，比如mtop。
        "maxkSockets": 1000,                 // [选填][number] 最大socket链接数，默认1000。建议与后端http server所支持的并发链接数一致。
        "keepAliveMsecs": 3000               // [选填][number] 发送TCP keepAlive包的间隔时长。默认为3000。注意需要考虑Node应用实际部署
                                             // 的情况。建议当Node与后端服务（可以是Java）部署在同一台机器上时，设置为3000。分开部署时如果网络
                                             // 延时比较严重或者后端服务经常处于高压之下而导致响应变慢，则应该适当调大该值。
    },
    /* mtop 接口代理配置 */
    "mtop": {                                // mtop接口访问配置，不需要时可以不配置
        "urls": {                            // [选填][object] mtop api地址，默认为说明示例
            "prod": "http://api.m.taobao.com/rest/h5ApiUpdate.do",
            "prep": "http://api.wapa.taobao.com/rest/h5ApiUpdate.do",
            "daily": "http://api.waptest.taobao.com/rest/h5ApiUpdate.do"
        },
        "tokenName": "_m_h5_tk",             // [选填][string] mtop 协议使用的token在cookie中的字段名，默认为_m_h5_tk
        "appKeys": {                         // mtop 协议使用的appKey，不同环境下使用的appKey可能不同
            "prod": 12574478,
            "prep": 12574478,                
            "daily": 4272                 
        }
    },
    /* modulet 接口代理配置 */
    "modulet": {
        "urls": {                            // [选填][object] modulet api地址。
            "prod": "http://i.taobao.com/modulet.do",
            "prep": "http://i.taobao.com/modulet.do",
            "daily": "http://i.taobao.com/modulet.do"
        }
    },
    /* hsf 接口代理配置 */
    "hsf": {                                 // hsfClient相关配置，不需要时可以不配置。参考node-hsf
        "enabled": true,                     // [选填][boolean] 是否启用hsf类型的接口代理。设置为false时，则不会做相应的插件初始化。默认true
        "configServers": {                   // hsf服务器配置地址，哪一个地址被启用取决于 status字段
            "prod": "commonconfig.config-host.taobao.com",
            "daily": "10.232.16.8",          
            "prep": "172.23.226.84"
        },
        "connectTimeout": 3000,              // [选填][number] 建立连接超时时间，默认为3000ms
        "responseTimeout": 3000,             // [选填][number] 响应超时时间，默认为3000ms
        "routeInterval": 60000,              // [选填][number] 向configSvr重新请求服务端地址、更新地址列表的间隔时间，默认为1分钟
        "snapshot": false,                   // [选填][boolean] 是否使用快照功能，使用快照则在启动的时候如果无法连接到config
                                             // server，则读取本地缓存的服务者地址。默认false
        "logOff": true,                      // [选填][boolean] 是否关闭日志。默认false
        "keepAlive": true,                   // [选填][boolean] 此client下生成的所有consumer是否与服务端维持长连接，默认为true
        "noDelay": true                      // [选填][boolean] 设置此client下生成的所有consumer是否关闭nagle算法，默认为true
    },
    /* mysql 接口代理配置 */
    "mysql": {  // mysql相关配置
        "pools": {
            "poolName1": {
                "host": "127.0.0.1",        // [选填][string] 数据库服务主机地址，默认localhost
                "port": 3306,               // [选填][number] 端口号，默认3306
                "user": "test",             // [必填][string] 用户名
                "password": "passw0rd",     // [必填][string] 密码
                "database": "dbtest",       // [必填][string] 数据库名
                "connectionLimit": 10       // [选填][string] 最大链接保有数，默认10
                // 更多关于链接配置请查看 [https://github.com/felixge/node-mysql#connection-options]
            },
            "poolName2": {
                // 同上
            }
            // ...
        },
        "defaultPool": "poolName1"          // [必填][string] 默认链接池名，当接口配置未指定具体的链接池时，则从默认连接池获取链接。
    },
    "interfaces": [ {
        // 此处设置每一个interface的具体配置
        // ... 不同类型的接口配置方法见下文
    } ]
}
```

### http interface 配置

``` js
 {
    "name": "这是接口名称",               // [选填][string] 接口名称
    "version": "0.0.1",                  // [选填][string] 接口版本号，发送请求时会带上版本号字段
    "type": "http",                      // [必填][string] 接口类型，取值可以是http或者hsf，使用http接口时其值必须为http
    "id": "cart.getCart",                // [必填][string] 接口ID，必须由英文单词+点号组成
    "urls": {                            // [如果ruleFile不存在, 则必须有一个地址存在][object] 可供切换的url集合
      "prod": "http://url1",             // 线上地址
      "prep": "http://url2",             // 预发地址
      "daily": "http://url3",            // 日常地址
    },
    "ruleFile": "cart.getCart.rule.json",// [选填][string] 对应的数据规则文件，当Proxy Mock状态开启时回返回mock数据
                                         // 不配置时默认为id + ".rule.json"。
    "isRuleStatic": true,                // [选填][boolean] 数据规则文件是否为静态，即在开启mock状态时，程序会将ruleFile
                                         // 按照静态文件读取, 而非解析该规则文件生成数据，默认为false
    "engine": "mockjs"                   // [选填][string] mock引擎，取值可以是river-mock和mockjs。覆盖全局engine
    "status": "prod",                    // [选填][string] 当前代理状态，可以是urls中的某个键值(prod, prep, daily)
                                         // 或者mock或mockerr。如果不填，则代理状态依照全局设置的代理状态；如果设置为mock，
                                         // 则返回 ruleFile中定义response内容；如果设置为mockerr，则返回ruleFile中定义
                                         // 的responseError内容。
    "method": "post",                    // [选填][string] 请求方式，取值post|get 默认get
    "dataType": "json",                  // [选填][string] 返回的数据格式， 取值 json|text|jsonp，仅当
                                         // bypassProxyOnClient设置为true时，jsonp才有效，否则由Node端发送的请求按json格
                                         // 式返回数据。默认为json
    "isCookieNeeded": true,              // [选填][boolean] 是否需要传递cookie默认false
    "encoding": "utf8",                  // [选填][string] 代理的数据源编码类型。取值可以是常用编码类型'utf8', 'gbk', 
                                         // 'gb2312' 或者 'raw' 如果设置为raw则直接返回2进制buffer，默认为utf8
                                         //  注意，不论数据源原来为何种编码，代理之后皆以utf8编码输出
    "timeout": 5000,                     // [选填][number] 延时设置，默认10000
    "intercepted": true,                 // [选填][boolean] 是否拦截请求。当设置为true时，如果在Node端启用了DataProxy拦截器
                                         // (见例六),则浏览器端可以直接通过interface id访问该接口，否则无法访问。默认为true
    "bypassProxyOnClient": false,        // [选填][boolean] 在浏览器端使用DataProxy请求数据时是否绕过代理而直接请求原地址。
                                         // 当且仅当status 字段不为mock或者mockerr时有效。默认 false
}
```

### mtop interface 配置

``` js
 {
    "name": "这是接口名称",                   // [选填][string] 接口名称
    "version": "1.0",                       // [选填][string] 接口版本号，发送请求时会带上版本号字段，默认1.0
    "type": "mtop",                         // [必填][string] 必须是mtop
    "id": "Detail.getTaobaoDyn",            // [必填][string] 接口ID，必须由英文单词+点号组成
    "api": "com.taobao.detail.getTaobaoDyn",// [必填][string] 需要调用的 mtop api 
    "ruleFile": "cart.getCart.rule.json",   // [选填][string] 对应的数据规则文件，当Proxy Mock状态开启时回返回mock数据
                                            // 不配置时默认为id + ".rule.json"。
    "isRuleStatic": true,                   // [选填][boolean] 数据规则文件是否为静态，即在开启mock状态时，程序会将ruleFile
                                            // 按照静态文件读取, 而非解析该规则文件生成数据，默认为false
    "engine": "river-mock"                  // [选填][string] mock引擎，取值可以是river-mock和mockjs。覆盖全局engine
    "status": "prod",                       // [选填][string] 当前代理状态，可以是mtop urls中的某个键值(prod, prep, daily)
                                            // 或者mock或mockerr。如果不填，则代理状态依照全局设置的代理状态；如果设置为mock，
                                            // 则返回 ruleFile中定义response内容；如果设置为mockerr，则返回ruleFile中定义
                                            // 的responseError内容。
    "dataOnly": false,                      // [选填][string] 是否只返回调用正确时的data。设置为true时，只返回mtop协议规定的
                                            // data字段内容，而忽略其他协议字段。且只要协议字段 retType 不为 0，即作为调用失败处理。
                                            // 否则返回包含了mtop协议字段全部结果集。默认为false
    "isCookieNeeded": true,                 // [选填][boolean] 是否需要传递cookie默认true
    "timeout": 5000,                        // [选填][number] 延时设置，默认5000
    "intercepted": true                     // [选填][boolean] 是否拦截请求。当设置为true时，如果在Node端启用了DataProxy拦截器
                                            // (见例六),则浏览器端可以直接通过interface id访问该接口，否则无法访问。默认为true
}
```

### modulet interface 配置

``` js
 {
    "name": "这是接口名称",                   // [选填][string] 接口名称
    "version": "1.0",                       // [选填][string] 接口版本号，发送请求时会带上版本号字段，默认1.0
    "type": "modulet",                      // [必填][string] 必须是mtop
    "id": "iTaobao.getMyFavourite",         // [必填][string] 接口ID，必须由英文单词+点号组成
    "moduletName": "favourite",             // [必填][string|Array<string>] 需要调用的 模块名，
                                            //  当设置为数组时，表示一次调用多个模块
    "ruleFile": "cart.getCart.rule.json",   // [选填][string] 对应的数据规则文件，当Proxy Mock状态开启时回返回mock数据
                                            // 不配置时默认为id + ".rule.json"。
    "isRuleStatic": true,                   // [选填][boolean] 数据规则文件是否为静态，即在开启mock状态时，程序会将ruleFile
                                            // 按照静态文件读取, 而非解析该规则文件生成数据，默认为false
    "engine": "river-mock"                  // [选填][string] mock引擎，取值可以是river-mock和mockjs。覆盖全局engine
    "status": "prod",                       // [选填][string] 当前代理状态，可以是mtop urls中的某个键值(prod, prep, daily)
                                            // 或者mock或mockerr。如果不填，则代理状态依照全局设置的代理状态；如果设置为mock，
                                            // 则返回 ruleFile中定义response内容；如果设置为mockerr，则返回ruleFile中定义
                                            // 的responseError内容。
    "dataOnly": false,                      // [选填][string] 是否只返回调用正确时的data。设置为true时，只返回modulte
                                            // 协议规定的data字段内容，而忽略其他协议字段。且只要协议字段 ret 不为 200，即作为调用失败处理。
                                            // 否则返回包含了mtop协议字段全部结果集。默认为false
    "isCookieNeeded": true,                 // [选填][boolean] 是否需要传递cookie默认true
    "timeout": 5000,                        // [选填][number] 延时设置，默认5000
    "intercepted": true                     // [选填][boolean] 是否拦截请求。当设置为true时，如果在Node端启用了DataProxy拦截器
                                            // (见例六),则浏览器端可以直接通过interface id访问该接口，否则无法访问。默认为true
}
```


### hsf interface 配置

``` js
{
    "name": "这是接口名称",                // [选填][string] 接口名称
    "version": "0.0.1.daily",            // [选填][string] 接口版本号，发送请求时会带上版本号字段
    "type": "hsf",                       // [必填][string] 接口类型，取值可以是http或者hsf，配置hsf接口时其值必须为hsf
    "id": "UserData.append",             // [必填][string] 接口ID，必须由英文单词+点号组成
    "service": "com.taobao.uic.common.service.userdata.UicDataService",  // 服务名
    "methodName": "insertData",          // [必填][string] 服务方法名
    "method": "POST",                    // [选填][string] 当需要在浏览器端通过DataProxy调用该接口时，需要指定method类型
                                         // 取值可能是 POST 和 GET。默认GET
    "ruleFile": "cart.getCart.rule.json",// [选填][string] 对应的数据规则文件，当Proxy Mock状态开启时回返回mock数据
                                         // 不配置时默认为id + ".rule.json"。
    "isRuleStatic": true,                // [选填][boolean] 数据规则文件是否为静态，即在开启mock状态时，程序会将ruleFile
                                         // 按照静态文件读取, 而非解析该规则文件生成数据，默认为false
    "intercepted": true,                 // [选填][boolean] 是否拦截请求。当设置为true时，如果在Node端启用了DataProxy拦截器
                                         // (见例六),则浏览器端可以直接通过interface id访问该接口，否则无法访问。默认为true
    "dataType": "json",                  // [选填][string] 数据返回类型。注意：此字段用于在浏览器使用DataProxy调用该接口时指定的
                                         // 返回数据类型。 在Node端，hsf返回的数据类型由java service本身返回的类型决定
    "group": "HSF",                      // [选填][string] group服务分组，默认为HSF，一般不需要更改
    "connectTimeout": 3000,              // [选填][number] 建立连接超时时间，默认为3000
    "responseTimeout": 3000,             // [选填][number] 响应超时时间，默认为3000
    "routeInterval": 60000,              // [选填][number] 向configSvr重新请求服务端地址、更新地址列表的间隔时间，默认为1分钟
    "keepAlive": true,                   // [选填][boolean] 此consumer是否与服务端维持长连接，默认为true
    "noDelay": true                      // [选填][boolean] 此consumer是否关闭nagle算法，默认为true
}
```

### mysql interface 配置

``` js
{
    "name": "获取购物车信息",                 // [选填][string] 接口名称
    "type": "mysql",                       // [必填][string] 接口类型, 必须为mysql
    "sql": "SELECT * FROM ?? WHERE ID = ? ORDER BY ??"  // [必填][string] 待执行的sql。
    // 注意sql中 ? 和 ??的区别。? 表示参数中需要填充相关的值，而 ?? 则表示需要填写的identifier如表名，字段名等等。
    // 虽然两者都是执行sql所需要指定的参数，但是两者被转义的规则不一样，以防止sql注入。
    "poolName": "poolName1",               // [选填][string] sql执行对应的连接池名，不配置时则取interface.
                                           // json#mysql配置中defaultPool所对应的连接池名
    "ruleFile": "cart.getCart.rule.json",   // [选填][string] 对应的数据规则文件，当Proxy Mock状态开启时回返回mock数据
                                            // 不配置时默认为id + ".rule.json"。
    "isRuleStatic": true,                   // [选填][boolean] 数据规则文件是否为静态，即在开启mock状态时，程序会将ruleFile
                                            // 按照静态文件读取, 而非解析该规则文件生成数据，默认为false
    "engine": "river-mock",                 // [选填][string] mock引擎，取值可以是river-mock和mockjs。覆盖全局engine
    "status": "prod",                       // [选填][string] 当前代理状态，可以是mtop urls中的某个键值(prod, prep, daily)
                                            // 或者mock或mockerr。如果不填，则代理状态依照全局设置的代理状态；如果设置为mock，
                                            // 则返回 ruleFile中定义response内容；如果设置为mockerr，则返回ruleFile中定义
                                            // 的responseError内容。
    "intercepted": true,                    // [选填][boolean] 是否拦截请求。
    "method": 'GET'                         // [选填][string] 在浏览器端使用DataProxy请求数据时的方式。默认为GET。
}
```

## API
---

### DataProxy.init
* DataProxy.init( path ) path为接口配置文件所在的绝对路径。如果使用midway-framework，则无需调用此方法。系统将在启动时按照程序自动完成初始化工作。

### DataProxy 对象创建方式

* 直接new

```js
var proxy = new DataProxy( profile );
```

* 工厂创建

```js
var proxy = DataProxy.create( profile );
```

### 创建DataProxy对象时指定的 *profile* 相关形式
* 接口ID  生成的对象会取ID最后'.'号后面的单词作为方法名

```js
DataProxy.create( 'Search.getItem' );
```

* 键值JSON对象   自定义方法名: 接口ID

```js
DataProxy.create( {
    getName: 'Session.getUserName',
    getMyCarts: 'Cart.getCarts'
} );
```

* 数组形式 取最后 . 号后面的单词作为方法名
下例中生成的方法调用名依次为: Cart_getItem, getItem, suggest, getName

```js
DataProxy.create( [ 'Cart.getItem', 'Search.getItem', 'Search.suggest', 'Session.User.getName' ] );
```

* 前缀形式 (推荐使用)

```js
DataProxy.create( 'Search.*' );
```

* 直接指定proxy所需要的options来创建

```js
DataProxy.create( {
    suggest: {
        "name": "热词推荐接口",
        "id": "Search.suggest",
        "urls": {
            "prod": "http://suggest.taobao.com/sug"
        },
        status: 'prod'
    }
} );
```

### DataProxy logger设置

```js
DataProxy.setLogger( logger );
```
不设置logger的情况下会使用console输出日志

### DataProxy对象方法

* .method( params )
method为创建proxy时动态生成，参数 params{Object}, 为请求接口所需要的参数键值对。

* .done( callback, errCallback )
接口调用完成函数，callback函数的参数与done之前调用的方法请求结果保持一致.最后一个参数为请求回写的cookie。callback函数中的 this 指向DataProxy对象本身，方便做进一步调用。errCallback 即出错回调函数（可能会被调用多次）。

* .withCookie( cookies )
如果接口需要提供cookie才能返回数据，则调用此方法来设置请求的cookie{String} (如何使用请查看用例七)

* .rewriteCookie( res | function  )
调用该函数以方便用户回写cookie，参数res{HttpResponse}为待回写response对象(参见例七)，此外其参数也可以是自定义回写函数，回写函数的参数为请求数据完毕后带回来需要回写的cookie

```js
proxy.getData()
    .withCookie( cookie )
    .done( function( result ) {
        // do sth...    
    } )
    .rewriteCookie( function( cookies ) {
        res.setHeader( 'Set-Cookie', cookies );
    } )
```

* .error( errCallback )
指定全局调用出错处理函数， errCallback 的参数为Error对象。

* .fail( errCallback )
同 error方法，方便不同的语法使用习惯。

## 如何使用DataProxy的Mock功能
---
### rule.json文件

rule.json文件定义一个接口具体的请求和应答数据的格式规范，该规范可以用来mock数据，同时也可以用来验证数据。当DataProxy mock状态开启时，mock引擎会读取与接口定义相对应的rule.json规则文件，生成相应的数据。该文件应该位于interface.json配置文件中ruleBase字段所指定的文件夹中。 (建议该文件夹与interface配置文件同级)

### rule.json文件内容样式

内容样式取决于DataProxy采用何种mock引擎，推荐使用阿里集团统一的River-mock。关于River规定的接口写法请参考[River-spec](http://gitlab.alibaba-inc.com/river/spec/tree/master)

* 样例

```js
{
    "meta": {
        "name": "basic"
    },
    "request": {
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": ["search"],
        "properties": {
            "search": {
                "type": "string"
            }
        }
    },
    "response": {
        "$schema": "http://json-schema.org/draft-04/schema#",
        "type": "object",
        "required": ["status"],
        "properties": {
            "status": {
                "type": "integer"
            }
        }
    }
}
```

### 指定特定的rule文件做mock
有时候，描述接口定义的rule文件不能满足mock需求。我们希望用于mock的规则文件不与接口定义文件相冲突。此时，可以在rulebase指定的文件夹中创建另外一分rule.json文件，同时在interface.json的接口引用中指定ruleFile字段来读取该文件，用来做特殊的mock。

## 如何开发DataProxy插件
// to be continued...

---


如有任何问题请联系[@善繁](https://work.alibaba-inc.com/work/u/68162)