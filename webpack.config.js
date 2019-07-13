const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const $pkg = require('./package.json');

module.exports = {
	mode: 'production',
	entry: './src/index.js',
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: 'index.js',
		publicPath: '/',
		library: $pkg.name,
		libraryTarget: "umd",
		libraryExport: 'default',
		globalObject: 'this'
	},
	module: {
		rules: [{
			test: /\.m?js$/,
			exclude: /node_modules/, // 指明不去转义node_modules下的代码
			use: {
				loader: 'babel-loader',
				options: {
					presets: ['@babel/preset-env']
				}
			}
		}]
	},
	plugins: [
		new CleanWebpackPlugin()
	],
	// 将报错信息明确指向源码位置的工具
	devtool: 'inline-source-map'
}
