用于小程序登录授权的工具包。

## 安装
```bash
npm install mini-program-authority
```

## 功能简介
mini-program-authority 对小程序前端的登录授权逻辑进行了封装。

开发者引入工具包，初始化传入必选参数后，直接调用工具包提供的方法，即可完成登录授权验证。

## 注意事项
最新微信小程序授权均采用授权按钮方式，我们这里要求，授权按钮放置于独立的授权页面。
授权页请求授权、授权信息存入开发者服务器的相关逻辑，交给开发者去实现。

## 使用说明
###1.init(loginApi, authPath, getUserInfo, getPhone, setUserInfo)：初始化 全局只初始化一次即可


loginApi(string，必选)：开发者服务器的登录接口地址


authPath(string，必选)：开发者自定义的授权页面地址


getUserInfo(function，必选)：从开发者服务器获取用户信息的方法

【要求】调用返回promise化的userInfo信息


getPhone(function，必选)：从开发者服务器获取用户手机号的方法

【要求】调用返回promise化的手机号信息


setUserInfo(function，非必须)：向开发者服务器存储用户信息的方法

【要求】调用返回promise，返回值为true或可转换成true的任意值皆可
【限制】传入参数严格等于wx.getUserInfo返回的字段值


**
【注】
setUserInfo逻辑，正常应在开发者自定义的授权页拿到用户授权后，由开发者直接执行，将获取的授权信息存入开发者服务器。
这里提供的setUserInfo参数，主要用于，用户允许授权，但授权页存入开发者服务器失败的场景下，备用。
如果不提供setUserInfo方法，建议必要时，在checkLogin回调中，将userInfo手动存入开发者服务器。
**



### 2.checkLogin：检查登录状态，返回promise化的userInfo

如果未登录，自动执行登录逻辑，其中包含请求授权用户信息。

如果已登录，获取用户信息并返回。

### 3.checkPhone：检查用户手机号，返回promise化的phone

如果开发者服务器存有用户手机号，直接返回。

如果没有，前往授权页获取授权。

### 4.getToken：获取前端本地缓存的token

代码层面缓存。
checkLogin一次后，全局可拿到值。



## 使用 Demo
1.封装promise化的request（仅供参考）
```javascript
// request.js
const request = options => new Promise((resolve, reject) => {
    wx.request({
		...options,
		success(res) {
			resolve(res);
		},
		fail(err) {
			reject(err);
		}
	});
});

export default request;

```

2.定义开发者服务器调用方法，用于init（仅供参考）
```javascript
// io/auth.js
import request from './request';
const Api = {}

// 获取用户信息（开发者服务器）
Api.getUserInfo = () => request({
  url: '/getUserInfo',
  method: 'get'
}).then(
  rs => rs.data // rs.data: {nickName : xxx, gender: GENDER ......}
)

// 获取手机号（开发者服务器）
Api.getPhone = () => request({
  url: '/getPhone',
  method: 'get'
}).then(
  rs => rs.data // rs.data: {phone: 13899990000}
)
```

3.页面使用demo
```javascript
// use.js
import auth from 'mini-program-authority';
import apiAuth from './io/auth';

// 初始化 建议在入口文件init
auth.init({
	loginApi: 'https://api.test.com/login',
	authPath: '/pages/auth',
	getUserInfo: apiAuth.getUserInfo,
	getPhone: apiAuth.getPhone
});

// 检查登录状态 在进入需要登录授权页面的前一个页面，进行checkLogin，checkLogin.then()内执行页面跳转，跳转到需授权的页面
auth.checkLogin().then(userInfo => {
	console.log('用户已登录：', userInfo);
	const token = auth.getToken();
	console.log('token:', token);
	// 检查用户手机号授权
	return auth.checkPhone().then(phone => {
		console.log('已获取用户手机号：', phone);
	});
}).catch(err => {
	console.log('err:', err);
});

```
