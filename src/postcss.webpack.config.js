import partial from 'webpack-partial';

import ExtractTextPlugin from 'extract-text-webpack-plugin';

// `postcss` modules.
import autoprefixer from 'autoprefixer';
import precss from 'precss';
import cssimport from 'postcss-import';
import constants from 'postcss-require';

// Regular expression used to detect what kind of files to process.
const IS_STYLE = /\.(scss|sass|css)$/;

/**
 * Convert a loader string and query object into a complete loader string.
 * @param {String} loader Name of loader.
 * @param {Object} query Parameters object.
 * @returns {String} Generated loader string with query.
 */
const pack = (loader, query) => {
  return `${loader}?${JSON.stringify(query)}`;
};

/**
 * Generate the correct `loader` object given the parameters.
 * @param {String} target The webpack target.
 * @param {Boolean} external Whether to generate external CSS files.
 * @param {Boolean} minimize Whether to compress generated CSS.
 * @param {String} loader Loader for processing the stylesheet into CSS.
 * @returns {String} Final loader.
 */
const loaders = ({target, external, minimize, loader}) => {
  const config = {
    modules: true,
    importLoaders: 1,
    localIdentName: '[name]-[local]-[hash:base64:5]',
    minimize: minimize,
  };
  const cssLoader = require.resolve('css-loader');
  const cssLocals = require.resolve('css-loader/locals');
  const styleLoader = require.resolve('style-loader');
  if (target === 'web') {
    if (external) {
      return ExtractTextPlugin.extract(
        styleLoader,
        `${pack(cssLoader, config)}!${loader}`
      );
    }
    return `${styleLoader}!${pack(cssLoader, config)}!${loader}`;
  }
  return `${pack(cssLocals, config)}!${loader}`;
};

export default (options = []) => (config) => {
  const {target} = config;
  const env = process.env.NODE_ENV || 'development';
  const hot = process.env.HOT || false;
  const production = env === 'production';

  const external = (production || !hot) && target === 'web';
  const minimize = production;

  if (!Array.isArray(options) && typeof options !== 'function') {
    throw new TypeError('`options` must be array or function!');
  }

  return partial(config, {
    // Module settings.
    module: {
      loaders: [{
        name: 'postcss',
        test: IS_STYLE,
        loader: loaders({
          loader: require.resolve('postcss-loader'),
          target,
          external,
          minimize,
        }),
      }],
    },

    postcss(webpack) {
      return [
        cssimport({
          // Make webpack acknowledge imported files.
          onImport: (files) => files.forEach((dep) =>
            webpack.addDependency(dep)),
          resolve: (id, {basedir}) =>
            webpack.resolveSync(basedir, id),
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
        precss,
        ...(Array.isArray(options) ? options : options(webpack)),
        autoprefixer({
          browsers: ['last 2 versions'],
        }),
      ];
    },

    plugins: [
      ...(external ? [
        // Some crawlers or things with Javascript disabled prefer normal CSS
        // instead of Javascript injected CSS, so this plugin allows for the
        // collection of the generated CSS into its own file.
        // .[contenthash]
        new ExtractTextPlugin('[name].css'),
      ] : []),
    ],
  });
};
