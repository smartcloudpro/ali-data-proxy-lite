## v1.1.6
* 修复1.1.5 改动引起的bug！

## v1.1.5
* 当http请求返回状态码为201或者202时，作为正确响应处理而非报错。
## v1.1.4
* http支持PUT方式

## v1.1.3
* 当用户配置的url被解析之后，path为空时会及时抛出异常，告知用户url不可用。

## v1.1.2
* 增加自定义回调错误标识，当fail或error函数被调用时，传入的err如果statusCode = -1，则表示为用户自己写的回调函数中存在错误，而非dataproxy请求数据时发生的错误。

## v1.1.1
* 去掉console

## v1.1.0
* 支持modulet
* 支持模拟数据时，优先启用以mock.json结尾的river-spec文件

## v1.0.10
* 修复了某些场景超时情况下request对象未创建而导致的undefined错误。

## v1.0.9
* 删除了一行多余的参数设置代码。

## v1.0.8
* 支持运行时动态添加interface options来创建DataProxy。

## v1.0.7
* 修复mysql plugin 重复报错的bug。

## v1.0.6
* 修复mysql plugin 不能正确报错的bug
* 提供在初始化DataProxy时，手工开启mock或者mockerr的快捷方式，方便开发调试

## v1.0.5
* 提供 rewriteCookie 方法，使之与 withCookie 方法调用对称。

## v1.0.4
* Bugfix 直接传入profile对象时也能正确的更新_config字段

## v1.0.3
* DataProxy 初始化参数bugfix

## v1.0.2
* 去掉对配置文件支持引入变量的解析功能
* 接入Midway-Framework插件标准

## v1.0.1
* 修改enablePlugins配置逻辑，默认为false，需要用户在配置文件中显式地启用plugin

## v1.0.0
* ModelProxy 正式更名为DataProxy 并且发布1.0版

## v0.6.2
* http plugin 支持url的path中带/:\w+/变量的解析，如url = 'projects/:id/files/:name'， 其中:id 和 :name在发送请求之前会被参数params.id和params.name替换。

## v0.6.1
* 增加捕捉导致 URIError 的异常字符的 log，直接输出到控制台

## v0.6.0
* 在http.js中querystringify方法内加try/catch 防止URIError和JSON循环引用问题

## v0.6.0-beta
* 修复了httpproxy重构之后关于res变量引用位置错误的bug
* 支持ModelProxy在node端调用mysql数据库
* 支持ModelProxy在浏览器端调用mysql接口
* 完善了mysql proxy测试用例

## v0.5.1-beta
* interface新增 enablePlugins 配置，方便用户通过配置启用或者禁用各种接口代理插件。
* 重构proxy.js，改变各种类型的接口拦截方式，如果为mock状态，则统一由proxy class代理拦截。

## v0.5.0
* http request final callback 之前增加判断是否结束，以防止重复callback

## v0.5.0-alpha1
* 修复了浏览器端调用mtop接口失败的bug

## v0.5.0-alpha
* 支持ModelProxy在node端访问mtop接口
* 支持ModelProxy在浏览器端访问mtop接口

## v0.4.1
* 暂时移除对hsf-protocol-cpp的依赖，以适应aone开发机部署环境。

## v0.4.0
* 收藏夹试点项目压测通过，版本已稳定。

## v0.4.0-alpha6
* 修改hsf timeout参数单位以及group默认值

## v0.4.0-alpha5
* 支持keepAliveMsecs参数配置，以适应不同部署场景下由于该参数设置不当而发生频繁的socket ECONNRESET错误

## v0.4.0-alpha4
* http请求失败的错误提示中增加rid，方便定位。

## v0.4.0-alpha3
* 增加http maxSockets配置文件
* 增加 http proxy callback 标记，避免重复callback。
* 修改错误提示中interface id显示成url的错误。
* http proxy 每次请求增加 rid 以标识唯一性

## v0.4.0-alpha2
* 修复hsf插件加载的bug
* 修复cookie专递失效的bug

## v0.4.0-alpha1
* 修复http timeout引起的socket hang up的bug

## v0.4.0-alpha
* hsfproxy功能实现
* hsfproxy拦截器实现
* hsfproxy浏览器端调用实现

## v0.3.2-beta
* 修复request interceptor getHeader的bug
* 重构InterfaceManager，采用Class方式对外提供方法。

## v0.3.2-alpha
* 增强statusCode不为200的报错内容

## v0.3.1
* 增强处理StatusCode 不为200的情况
* 增强错误提示，每次请求代理失败，需要明确对应的interface id以及请求的url，以方便错误定位

## v0.3.0
* 修复querystring 与version参数拼接的bug。
* 修复done内方法异常捕获error变量未定义的bug。

## v0.3.0-beta1
* 修复interface Rule路径读取bug。

## v0.3.0-beta
* Proxy 插件化实现。

## v0.3.0-alpha-2
* 升级river-mock。

## v0.3.0-alpha
* proxy底层采用继承方式重构。
* 支持捕获customized code异常。

## v0.2.8
* 支持interface配置文件变量引用。
* 重载ModelProxy.init( path, variables )。variables参数为开发者传入的用于解析interface配置文件中出现的变量的变量对象。
