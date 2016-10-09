import {loader, plugin} from 'webpack-partial';
import compose from 'lodash/fp/compose';
import identity from 'lodash/fp/identity';

import ExtractTextPlugin from 'extract-text-webpack-plugin';

// `postcss` modules.
import autoprefixer from 'autoprefixer';
import cssimport from 'postcss-import';
import constants from 'postcss-require';

// Regular expression used to detect what kind of files to process.
const IS_STYLE = /\.(scss|sass|css)$/;
const IS_CSS_JS = /\.css\.js$/;

/**
 * Generate the correct `loader` object given the parameters.
 * @param {String} target The webpack target.
 * @param {Boolean} external Whether to generate external CSS files.
 * @param {Boolean} minimize Whether to compress generated CSS.
 * @param {String} loader Loader for processing the stylesheet into CSS.
 * @returns {String} Final loader.
 */
const loaders = ({target, external, minimize, loaders, plugin}) => {
  const config = {
    modules: true,
    importLoaders: 1,
    localIdentName: '[name]-[local]-[hash:base64:5]',
    minimize: minimize,
    sourceMap: true,
  };
  const cssLoader = require.resolve('css-loader');
  const cssLocals = require.resolve('css-loader/locals');
  const styleLoader = require.resolve('style-loader');
  if (target === 'web') {
    if (external) {
      return [plugin.loader({omit: 1, remove: true}), {
        loader: styleLoader,
      }, {
        loader: cssLoader,
        query: config,
      },
      ...loaders];
    }
    return [{
      loader: styleLoader,
    }, {
      loader: cssLoader,
      query: config,
    }, ...loaders];
  }
  return [{
    loader: cssLocals,
    query: config,
  }, ...loaders];
};

export default ({
  options = [],
  filename = '[name].css',
} = {}) => (config) => {
  const {target = 'web'} = config;
  const env = process.env.NODE_ENV || 'development';
  const hot = process.env.HOT || false;
  const production = env === 'production';

  const external = (production || !hot) && target === 'web';
  const minimize = production;

  if (!Array.isArray(options) && typeof options !== 'function') {
    throw new TypeError('`options` must be array or function!');
  }

  const postcss = (webpack) => {
    return [
      cssimport({
        // Make webpack acknowledge imported files.
        onImport: (files) => files.forEach((dep) =>
          webpack.addDependency(dep)),
        resolve: (id, basedir) => {
          return new Promise((resolve, reject) => {
            webpack.resolve(basedir, id, (err, result) => {
              err ? reject(err) : resolve(result);
            });
          });
        },
      }),
      constants({
        require: (request, _, done) => {
          webpack.loadModule(request, (err, source) => {
            if (err) {
              done(err);
            } else {
              let result = null;
              try {
                result = webpack.exec(source, request);
                // interop for ES6 modules
                if (result.__esModule && result.default) {
                  result = result.default;
                }
              } catch (e) {
                done(e);
                return;
              }
              // Don't need to call `this.addDependency` since the
              // `loadModule` function takes care of it.
              done(null, result);
            }
          });
        },
      }),
      ...(Array.isArray(options) ? options : options(webpack)),
      autoprefixer({
        browsers: ['last 2 versions'],
      }),
    ];
  };

  const extractor = new ExtractTextPlugin({filename});

  const result = compose(
    loader({
      test: IS_STYLE,
      loaders: loaders({
        loaders: [{
          loader: require.resolve('postcss-loader'),
          query: {plugins: postcss},
        }],
        target,
        external,
        minimize,
        plugin: extractor,
      }),
    }),
    loader({
      test: IS_CSS_JS,
      loaders: loaders({
        loaders: [{
          loader: require.resolve('postcss-loader'),
          query: {plugins: postcss},
        }, {
          loader: require.resolve('css-js-loader'),
        }],
        target,
        external,
        minimize,
        plugin: extractor,
      }),
    }),
    // Some crawlers or things with Javascript disabled prefer normal CSS
    // instead of Javascript injected CSS, so this plugin allows for the
    // collection of the generated CSS into its own file.
    external ? plugin(extractor) : identity
  )(config);

  return result;
};
