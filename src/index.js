// promise化的wx api
import $wxp from './io/wxp';
// 忽略形如wx等全局变量或方法的未定义检查
/* eslint-disable no-undef */

/* ***** 存储暴露给外部调用的方法 ***** */
const user = {};
/* ***** 存储不需要被外部访问的方法 ***** */
const privates = {
	token: '',
	userInfo: '',
	phone: ''
};

/* ********** 外部方法定义 ********** */

// 检查用户是否在登录态
user.checkLogin = () => privates.checkStorage().then(token => {
	// 如果在登录态
	if (token) {
		// 检查token是否过期
		return privates.checkSession().then(isOutDate => {
			// token已过期
			if (isOutDate) {
				// 重新执行登录
				return privates.login().then(rs => {
					if (rs && rs.data) {
						const newToken = rs.data.token;
						// 缓存token
						return privates.tokenStorage(newToken).then(() => {
							// 前端本地缓存token(代码里缓存)
							privates.token = newToken;
							// 检查本地服务器，是否已存有用户信息
							return user.checkUserInfo(newToken);
						})
					} else {
						return Promise.reject(rs.msg || '登录失败');
					}
				})
			} else {
				// token未过期
				// 前端本地缓存token(代码里缓存)
				privates.token = token;
				// 检查本地服务器，是否已存有用户信息
				return user.checkUserInfo(token);
			}
		})
	} else {
		// 如果不在登录态
		// 检查用户是否已经授权获取用户信息（需要先授权，再登录）
		return privates.checkUserInfoAuth('checkLogin');
	}
}).catch(err => {
	// 在最外层promise catch掉本层($wxp.getStorage)及内部所有错误，并返回给页面
	return Promise.reject(err);
});

// 检查本地服务器是否存在用户信息
user.checkUserInfo = () =>
	privates.getUserInfo().then(userInfo => {
		// 本地服务器已存在用户信息
		if (userInfo) {
			// 前端本地缓存用户信息
			privates.userInfo = userInfo;
			// 直接返回用户信息
			return userInfo;
		} else {
			// 本地服务器无用户信息。检查用户信息是否已授权获取
			return privates.checkUserInfoAuth('checkUserInfo');
		}
	});

// 检查本地服务器是否存在用户手机号
user.checkPhone = () => privates.getPhone().then(rs => {
	// 本地服务器已存在用户手机号
	if (rs) {
		// 前端本地缓存用户手机号
		privates.phone = rs;
		// 直接返回
		return rs;
	} else {
		// 本地服务器无用户手机号。前往授权页请求授权手机号
		return privates.navigateToAuthPage('phone');
	}
});


// 提供外部获取用户token的方法
user.getToken = function () {
	return privates.token;
};

// 提供外部获取用户信息的方法
user.getUserInfo = function () {
	return privates.userInfo;
};

// 提供外部获取用户手机号的方法
user.getPhone = function () {
	return privates.phone;
};



/* ********** 私有方法定义 ********** */

// 缓存token
privates.tokenStorage = token => $wxp.setStorage({
	key: 'token',
	data: token
});

// 获取用户信息（微信）
privates.getWxUserInfo = () => $wxp.getUserInfo({
	// 获取包含 encryptedData, iv 等敏感信息的 userInfo
	withCredentials: true,
	lang: 'zh_CN'
});

// 用户信息初始化
privates.userInfoInit = () =>
	privates.getWxUserInfo().then(wxUserInfo => {
		// 如果用户提供了本地服务器存储用户信息的方法，则调用，将用户信息存储到本地服务器
		if (privates.setUserInfo) {
			return privates.setUserInfo(wxUserInfo.userInfo).then(rs => {
				if (rs) {
					privates.userInfo = wxUserInfo.userInfo;
					return wxUserInfo.userInfo;
				} else {
					return Promise.reject('用户信息存储失败，请稍后再试');
				}
			})
		} else {
			privates.userInfo = wxUserInfo.userInfo;
			return wxUserInfo.userInfo;
		}
	});

// 跳转到用户授权页
privates.navigateToAuthPage = authType => {
	const pages = getCurrentPages();
	const currUrl = pages[pages.length - 1].route;
	// 跳到自定义的授权登录页，让用户点击按钮授权
	wx.navigateTo({
		url: `${privates.authPath}?from=/${currUrl}&authType=${authType}`
	})
	// 返回reject状态，防止进入.then
	return Promise.reject('未获取用户授权');
};

// 检查用户信息授权状态
privates.checkUserInfoAuth = caller => privates.isUserInfoAuth().then(isAuth => {
	// 如果用户已授权访问用户信息
	if (isAuth) {
		if (caller === 'checkLogin') {
			// 直接执行登录
			return privates.login().then(rs => {
				if (rs && rs.data) {
					const token = rs.data.token;
					// 缓存token
					return privates.tokenStorage(token).then(() => {
						// 前端本地缓存token(代码里缓存)
						privates.token = token;
						// 获取微信用户信息
						return privates.userInfoInit();
					})
				} else {
					return Promise.reject(rs.msg || '登录失败');
				}
			})
		} else {
			// 获取微信用户信息
			return privates.userInfoInit();
		}
	} else {
		// 未授权访问用户信息。前往授权页请求授权用户信息
		return privates.navigateToAuthPage('userInfo');
	}
});

// 检查用户是否已授权访问用户信息
privates.isUserInfoAuth = () => $wxp.getSetting().then(res => res.authSetting['scope.userInfo']);

// 检查storage是否存有token
privates.checkStorage = () => $wxp.getStorage({
	key: 'token'
}).then(storage => storage).catch(() => '');

// 检查token是否过期
privates.checkSession = () => $wxp.checkSession().then(() => false).catch(() => true);

// 执行登录
privates.login = () => $wxp.login().then(res => {
	if (res.code) {
		return $wxp.request({
			url: privates.loginApi,
			method: 'get',
			data: {
				code: res.code
			}
		});
	} else {
		return Promise.reject(`登录失败！${res.errMsg}`);
	}
});


// 对象初始化（工具包入口）
user.init = ({
	loginApi,
	authPath,
	getUserInfo,
	getPhone,
	setUserInfo
}) => {
	privates.loginApi = loginApi;
	privates.authPath = authPath;
	privates.getUserInfo = getUserInfo;
	privates.getPhone = getPhone;
	privates.setUserInfo = setUserInfo;
}

export default user;
