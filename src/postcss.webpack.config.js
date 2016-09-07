import compose from 'lodash/fp/compose';
import {loader, plugin, partial} from 'webpack-partial';

import ExtractTextPlugin from 'extract-text-webpack-plugin';

// `postcss` modules.
import autoprefixer from 'autoprefixer';
import cssimport from 'postcss-import';
import constants from 'postcss-require';

// Regular expression used to detect what kind of files to process.
const IS_STYLE = /\.(scss|sass|css(\.js)?)$/;
const IS_CSS_JS = /\.css\.js$/;

/**
 * Convert a loader string and query object into a complete loader string.
 * @param {String} loaderPath Module path of the loader.
 * @param {Object} query Parameters object.
 * @returns {String} Generated loader string with query.
 */
const pack = (loaderPath, query) => {
  return `${loaderPath}?${JSON.stringify(query)}`;
};

/**
 * Generate the correct `loader` string given the parameters.
 * @param {String} options.localIdentName CSS module class name format.
 * @param {Boolean} options.external Whether to generate external CSS files.
 * @param {Boolean} options.minimize Whether to compress generated CSS.
 * @param {Boolean} options.modules Whether to generate css modules.
 * @param {String} options.target The webpack target, `web`, `node`, etc.
 * @returns {String} Final loader.
 */
const cssLoaders = ({localIdentName, external, minimize, modules, target}) => {
  const config = {
    importLoaders: 1,
    sourceMap: true,
    localIdentName,
    minimize,
    modules,
  };
  const postcssLoader = require.resolve('postcss-loader');
  const cssLoader = require.resolve('css-loader');
  const cssLocals = require.resolve('css-loader/locals');
  const styleLoader = require.resolve('style-loader');
  if (target === 'web') {
    if (external) {
      return ExtractTextPlugin.extract(
        styleLoader,
        `${pack(cssLoader, config)}!${postcssLoader}`
      );
    }
    return `${styleLoader}!${pack(cssLoader, config)}!${postcssLoader}`;
  }
  return `${pack(cssLocals, config)}!${postcssLoader}`;
};

const cssJsLoader = loader({
  name: 'css-js',
  test: IS_CSS_JS,
  loader: require.resolve('css-js-loader'),
});

/**
 * Create a webpack config partial function that applies postcss-loader.
 * @param {String|Boolean} options.extract Filename to extract css into. Provide
 * a falsy value to disable external CSS file generation.
 * @param {Boolean} options.minimize Whether to compress generated CSS.
 * @param {Boolean} options.modules Whether to process CSS as modules.
 * @param {String} options.localIdentName CSS module class name format.
 * @returns {Function} A webpack config partial function.
 */
const postcssLoader = ({extract, minimize, modules, localIdentName}) =>
  (config) => loader({
    name: 'postcss',
    test: IS_STYLE,
    loader: cssLoaders({
      target: config.target,
      external: !!extract,
      localIdentName,
      minimize,
      modules,
    }),
  })(config);

/**
 * Create a webpack config partial function that applies a postcss config.
 * @param {Array|Object|Function} options.options A postcss-loader config.
 * @param {Object} options.autoprefixer An autoprefixer config object.
 * @returns {Function} A webpack config partial function.
 */
const postcssConfig = ({options, autoprefixer: autoprefixerConfig}) =>
  (config) => partial(config, {
    postcss(webpack) {
      const config = typeof options === 'function' ? options(webpack) : options;
      const normalized = Array.isArray(config) ? {plugins: config} : config;

      return {
        ...normalized,
        plugins: [
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
          ...normalized.plugins,
          ...autoprefixerConfig ? [autoprefixer(autoprefixerConfig)] : [],
        ],
      };
    },
  });

/**
 * Create an ExtractTextPlugin webpack config partial function. The plugin is
 * included only if `extract` is not falsy and the current build targets web.
 *
 * @param  {String} extract) Filename to extract css into.
 * @returns {Function} A webpack config partial function.
 */
const extractPlugin = (extract) => (config) =>
  !!extract && config.target === 'web'
    ? plugin(new ExtractTextPlugin(extract), config)
    : config;

/**
 * Create a postcss webpack config partial function.
 * @param {Array|Object|Function} options.options A postcss-loader config.
 * @param {String|Boolean} options.extract Filename to extract css into. Provide
 * a falsy value to disable external CSS file generation.
 * @param {Object} options.autoprefixer An autoprefixer config object.
 * @param {Boolean} options.minimize Whether to compress generated CSS.
 * @param {Boolean} options.modules Whether to process CSS as modules.
 * @param {String} options.localIdentName CSS module class name format.
 * @returns {Function} A webpack config partial function.
 */
export default ({
  options = [],
  extract = process.env.NODE_ENV === 'production'
    ? '[name].[hash].css'
    : '[name].css',
  autoprefixer = {
    browsers: ['last 2 versions'],
  },
  minimize = process.env.NODE_ENV === 'production',
  modules = true,
  localIdentName = process.env.NODE_ENV === 'production'
    ? '[hash:base64]'
    : '[path]--[local]--[hash:base64:5]',
} = {}) => compose(
  // Add css-js-loader. This will feed parsed js styles into postcss-loader.
  cssJsLoader,
  // Add postcss-loader.
  postcssLoader({extract, localIdentName, minimize, modules}),
  // Add postcss-loader config.
  postcssConfig({options, autoprefixer}),
  // Add ExtractTextPlugin instance.
  extractPlugin(extract)
);
