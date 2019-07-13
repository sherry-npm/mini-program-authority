module.exports = {
	"root": true,
    "env": {
        "browser": true,
        "es6": true,
        "node": true
    },
    "extends": "eslint:recommended",
    "globals": {
        "Atomics": "readonly",
        "SharedArrayBuffer": "readonly"
	},
	"parser": "babel-eslint",
    "parserOptions": {
        "ecmaVersion": 2018,
        "sourceType": "module"
	},
    "rules": {
		// allow optionalDependencies
		'import/no-extraneous-dependencies': 0,
		// 禁止++运算符
		'no-plusplus': 0,
		// 不允许修改参数
		'no-param-reassign': 0,
		// 避免引号属性名
		'quote-props': 0,
		// 函数应当具名
		'func-names': 0,
		// 使用字符串模板，而不是+
		'prefer-template': 0,
		// 在定义对象或数组时，最后一项不能加逗号
		'comma-dangle': [2, 'never'],
		// 箭头函数中，在需要的时候，在参数外使用小括号（只有一个参数时，可以不适用括号，其它情况下都需要使用括号）
		'arrow-parens': [2, 'as-needed'],
		// 要求使用 const 来声明变量
		'prefer-const': 0,
		// 无console
		'no-console': 0,
		// 无tab
		'no-tabs': 0,
		// 用什么来缩进，规定使用tab 来进行缩进，switch中case也需要一个tab .
		'indent': [2, 'tab', { 'SwitchCase': 1 }],
		// 单行最大长度限制
		'max-len': 0,
		// 偏好解构赋值
		'prefer-destructuring': 0,
		// allow debugger during development
		'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0
    }
};
