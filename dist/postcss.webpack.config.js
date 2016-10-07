'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _webpackPartial = require('webpack-partial');

var _compose = require('lodash/fp/compose');

var _compose2 = _interopRequireDefault(_compose);

var _identity = require('lodash/fp/identity');

var _identity2 = _interopRequireDefault(_identity);

var _extractTextWebpackPlugin = require('extract-text-webpack-plugin');

var _extractTextWebpackPlugin2 = _interopRequireDefault(_extractTextWebpackPlugin);

var _autoprefixer = require('autoprefixer');

var _autoprefixer2 = _interopRequireDefault(_autoprefixer);

var _postcssImport = require('postcss-import');

var _postcssImport2 = _interopRequireDefault(_postcssImport);

var _postcssRequire = require('postcss-require');

var _postcssRequire2 = _interopRequireDefault(_postcssRequire);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

// `postcss` modules.


// Regular expression used to detect what kind of files to process.
var IS_STYLE = /\.(scss|sass|css)$/;
var IS_CSS_JS = /\.css\.js$/;

/**
 * Generate the correct `loader` object given the parameters.
 * @param {String} target The webpack target.
 * @param {Boolean} external Whether to generate external CSS files.
 * @param {Boolean} minimize Whether to compress generated CSS.
 * @param {String} loader Loader for processing the stylesheet into CSS.
 * @returns {String} Final loader.
 */
var loaders = function loaders(_ref) {
  var target = _ref.target;
  var external = _ref.external;
  var minimize = _ref.minimize;
  var _loaders = _ref.loaders;
  var plugin = _ref.plugin;

  var config = {
    modules: true,
    importLoaders: 1,
    localIdentName: '[name]-[local]-[hash:base64:5]',
    minimize: minimize,
    sourceMap: true
  };
  var cssLoader = require.resolve('css-loader');
  var cssLocals = require.resolve('css-loader/locals');
  var styleLoader = require.resolve('style-loader');
  if (target === 'web') {
    if (external) {
      return [plugin.loader({ omit: 1, remove: true }), {
        loader: styleLoader
      }, {
        loader: cssLoader,
        query: config
      }].concat(_toConsumableArray(_loaders));
    }
    return [{
      loader: styleLoader
    }, {
      loader: cssLoader,
      query: config
    }].concat(_toConsumableArray(_loaders));
  }
  return [{
    loader: cssLocals,
    query: config
  }].concat(_toConsumableArray(_loaders));
};

exports.default = function () {
  var _ref2 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  var _ref2$options = _ref2.options;
  var options = _ref2$options === undefined ? [] : _ref2$options;
  var _ref2$filename = _ref2.filename;
  var filename = _ref2$filename === undefined ? '[name].css' : _ref2$filename;
  return function (config) {
    var _config$target = config.target;
    var target = _config$target === undefined ? 'web' : _config$target;

    var env = process.env.NODE_ENV || 'development';
    var hot = process.env.HOT || false;
    var production = env === 'production';

    var external = (production || !hot) && target === 'web';
    var minimize = production;

    if (!Array.isArray(options) && typeof options !== 'function') {
      throw new TypeError('`options` must be array or function!');
    }

    var postcss = function postcss(webpack) {
      return [(0, _postcssImport2.default)({
        // Make webpack acknowledge imported files.
        onImport: function onImport(files) {
          return files.forEach(function (dep) {
            return webpack.addDependency(dep);
          });
        },
        resolve: function resolve(id, basedir) {
          return new Promise(function (resolve, reject) {
            webpack.resolve(basedir, id, function (err, result) {
              err ? reject(err) : resolve(result);
            });
          });
        }
      }), (0, _postcssRequire2.default)({
        require: function require(request, _, done) {
          webpack.loadModule(request, function (err, source) {
            if (err) {
              done(err);
            } else {
              var _result = null;
              try {
                _result = webpack.exec(source, request);
                // interop for ES6 modules
                if (_result.__esModule && _result.default) {
                  _result = _result.default;
                }
              } catch (e) {
                done(e);
                return;
              }
              // Don't need to call `this.addDependency` since the
              // `loadModule` function takes care of it.
              done(null, _result);
            }
          });
        }
      })].concat(_toConsumableArray(Array.isArray(options) ? options : options(webpack)), [(0, _autoprefixer2.default)({
        browsers: ['last 2 versions']
      })]);
    };

    var extractor = new _extractTextWebpackPlugin2.default({ filename: filename });

    var result = (0, _compose2.default)((0, _webpackPartial.loader)({
      test: IS_STYLE,
      loaders: loaders({
        loaders: [{
          loader: require.resolve('postcss-loader'),
          query: { options: postcss }
        }],
        target: target,
        external: external,
        minimize: minimize,
        plugin: extractor
      })
    }), (0, _webpackPartial.loader)({
      test: IS_CSS_JS,
      loaders: loaders({
        loaders: [{
          loader: require.resolve('postcss-loader'),
          query: { options: postcss }
        }, {
          loader: require.resolve('css-js-loader')
        }],
        target: target,
        external: external,
        minimize: minimize,
        plugin: extractor
      })
    }),
    // Some crawlers or things with Javascript disabled prefer normal CSS
    // instead of Javascript injected CSS, so this plugin allows for the
    // collection of the generated CSS into its own file.
    external ? (0, _webpackPartial.plugin)(extractor) : _identity2.default)(config);

    return result;
  };
};
//# sourceMappingURL=postcss.webpack.config.js.map