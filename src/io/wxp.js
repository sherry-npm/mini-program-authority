// 忽略形如wx等全局变量或方法的未定义检查
/* eslint-disable no-undef */

const wxp = {};
const methods = [
  'request',
  'login',
  'checkSession',
  'setStorage',
  'getStorage',
  'getUserInfo',
  'getSetting',
];

// 部分微信api的promise化
methods.forEach((method) => {
  wxp[method] = (options) =>
    new Promise((resolve, reject) => {
      wx[method]({
        ...options,
        success(res) {
          resolve(res.data || res);
        },
        fail(err) {
          reject(err);
        },
      });
    });
});

export default wxp;
