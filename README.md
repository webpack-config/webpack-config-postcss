# webpack-config-postcss

Use all the magic of [postcss] for stylesheets with [webpack].

![build status](http://img.shields.io/travis/webpack-config/webpack-config-postcss/master.svg?style=flat)
![coverage](http://img.shields.io/coveralls/webpack-config/webpack-config-postcss/master.svg?style=flat)
![license](http://img.shields.io/npm/l/webpack-config-postcss.svg?style=flat)
![version](http://img.shields.io/npm/v/webpack-config-postcss.svg?style=flat)
![downloads](http://img.shields.io/npm/dm/webpack-config-postcss.svg?style=flat)

## Usage

Install:

```sh
npm install --save webpack-config-postcss
```

Add to your `webpack.config.babel.js`:

```javascript
import postcss from `webpack-config-postcss`;

postcss()({
  /* existing webpack configuration */
})
```

[postcss]: https://github.com/postcss/postcss
[webpack]: https://webpack.github.io
