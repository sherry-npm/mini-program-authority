// promise化的wx api
import $wxp from './io/wxp';
// 忽略形如wx等全局变量或方法的未定义检查
/* eslint-disable no-undef */

/* ***** 存储暴露给外部调用的方法 ***** */
const user = {};
/* ***** 存储不需要被外部访问的方法 ***** */
const privates = {
  token: '',
  userInfo: null,
  phone: '',
};

/* ********** 私有方法定义 ********** */

// 检查storage 返回 token/''
privates.checkStorage = () =>
  $wxp
    .getStorage({
      key: 'token',
    })
    .then((data) => data)
    .catch(() => '');

// 检查用户授权信息 返回 true/false
privates.isUserInfoAuth = () =>
  $wxp
    .getSetting()
    .then((res) => res.authSetting['scope.userInfo'])
    .catch((err) =>
      Promise.reject(`[from wechat catch]检查用户授权信息失败：${err}`)
    );

// 检查token是否过期 返回 true/false
privates.checkSession = () =>
  $wxp
    .checkSession()
    .then(() => false)
    .catch(() => true);

// 微信登录 返回 code
privates.wxLogin = () =>
  $wxp
    .login()
    .then((res) => res && res.code)
    .catch((err) =>
      Promise.reject(`[from wechat catch]执行微信登录失败：${err}`)
    );

// 开发者服务器登录 返回 token
privates.login = () =>
  privates.wxLogin().then((code) => {
    if (code) {
      return $wxp
        .request({
          url: privates.loginApi,
          method: 'get',
          data: {
            code,
          },
        })
        .then((rs) => {
          if (rs && rs.data) {
            return rs.data.token;
          } else {
            return Promise.reject(rs.msg || rs.message || '登录失败');
          }
        })
        .catch((err) => Promise.reject(`[from catch]登录失败：${err}`));
    } else {
      return Promise.reject(`[from wechat]登录失败：${res.errMsg}`);
    }
  });

// storage缓存token 无返回值 成功走then，失败走catch
privates.saveToken = (token) =>
  $wxp
    .setStorage({
      key: 'token',
      data: token,
    })
    .catch((err) => Promise.reject(`[from wechat catch]token缓存失败：${err}`));

// 获取微信用户信息
privates.getWxUserInfo = () =>
  $wxp
    .getUserInfo({
      lang: 'zh_CN',
    })
    .then((res) => res && res.userInfo)
    .catch((err) =>
      Promise.reject(`[from wechat catch]获取用户信息失败：${err}`)
    );

// 跳转到用户授权页
privates.navigateToAuthPage = (authType) => {
  const pages = getCurrentPages();
  const currUrl = pages[pages.length - 1].route;
  const options = pages[pages.length - 1].options;
  let path = `/${currUrl}`;
  if (options) {
    path = path + '?';
    Object.keys(options).forEach((key) => {
      const value = options[key];
      path = path + `${key}=${value}&`;
    });
    path = encodeURIComponent(`${path.substring(0, path.length - 1)}`);
  }
  // 跳到自定义的授权登录页，让用户点击按钮授权
  wx.navigateTo({
    url: `${privates.authPath}?from=${path}&authType=${authType}`,
  });
  // 返回reject状态，防止进入.then
  return Promise.reject('未获取用户授权');
};

// 用户信息初始化
privates.userInfoInit = () =>
  privates.getWxUserInfo().then((wxUserInfo) => {
    // 如果用户提供了本地服务器存储用户信息的方法，则调用，将用户信息存储到本地服务器
    if (privates.setUserInfo) {
      return privates.setUserInfo(wxUserInfo).then((rs) => {
        if (rs) {
          privates.userInfo = wxUserInfo;
          return wxUserInfo;
        } else {
          return Promise.reject('用户信息存储失败，请稍后再试');
        }
      });
    } else {
      privates.userInfo = wxUserInfo;
      return wxUserInfo;
    }
  });

// 执行登录
privates.doLogin = (callback) =>
  privates.login().then((token) => {
    // 前端本地缓存token(代码里缓存)
    privates.token = token;
    // 缓存token
    return privates.saveToken(token).then(() => {
      return callback(token);
    });
  });

// 检查用户信息授权状态
privates.checkUserInfoAuth = () =>
  privates.isUserInfoAuth().then((isAuth) => {
    // 如果用户已授权访问用户信息
    if (isAuth) {
      // 直接执行登录
      return privates.doLogin(privates.userInfoInit);
    } else {
      // 未授权访问用户信息。前往授权页请求授权用户信息
      return privates.navigateToAuthPage('userInfo');
    }
  });

// 检查本地服务器是否存在用户信息
privates.checkUserInfo = (token) =>
  privates.getUserInfo(token).then((userInfo) => {
    // 开发者服务器已存在用户信息
    if (userInfo) {
      // 前端本地缓存用户信息
      privates.userInfo = userInfo;
      // 直接返回用户信息
      return userInfo;
    } else {
      // 开发者服务器无用户信息，直接获取微信用户信息（执行到这里，走的一定是storage已有token分支。有token说明授权登录过，不必再次请求授权）
      return privates.userInfoInit();
    }
  });

// 检查token是否存在、以及是否过期（返回token）
privates.checkToken = () =>
  privates.checkStorage().then((token) => {
    if (token) {
      // 检查token是否过期
      return privates.checkSession().then((isExpired) => {
        if (!isExpired) {
          privates.token = token;
          return token;
        }
      });
    }
  });

/* ********** 外部方法定义 ********** */

// 获取token的方法（本次运行小程序缓存的token，仅在本次运行有效）
user.getToken = () => privates.token;

// 检查用户登录状态 返回 userInfo
user.checkLogin = () => {
  // 如果本次代码运行，已检查过登录状态，则token有值。直接取即可
  if (privates.token && privates.userInfo) {
    return Promise.resolve(privates.userInfo);
  } else {
    return privates.checkStorage().then((token) => {
      if (token) {
        // 检查token是否过期
        return privates.checkSession().then((isExpired) => {
          // token未过期，直接拉取开发者服务器用户信息
          if (!isExpired) {
            privates.token = token;
            // 检查开发者服务器是否存有用户信息
            return privates.checkUserInfo(token);
          } else {
            // token过期，重新执行登录
            return privates.doLogin(privates.checkUserInfo);
          }
        });
      } else {
        return privates.checkUserInfoAuth();
      }
    });
  }
};

// 检查用户手机号 返回 phone
user.checkPhone = () => {
  if (privates.phone) {
    return Promise.resolve(privates.phone);
  } else {
    return privates.getPhone().then((rs) => {
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
  }
};

// 最新用户信息获取
user.checkUserInfo = () => privates.checkUserInfo(privates.token);

// 手动检查storage里是否有未过期token
user.checkToken = privates.checkToken;

// 对象初始化（工具包入口）
user.init = ({ loginApi, authPath, getUserInfo, getPhone, setUserInfo }) => {
  privates.loginApi = loginApi;
  privates.authPath = authPath;
  privates.getUserInfo = getUserInfo;
  privates.getPhone = getPhone;
  privates.setUserInfo = setUserInfo;
};

export default user;
