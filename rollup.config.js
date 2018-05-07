import pkg from './package.json'

import builtins from 'rollup-plugin-node-builtins'
import globals from 'rollup-plugin-node-globals'
import commonjs from 'rollup-plugin-commonjs'
import nodeResolve from 'rollup-plugin-node-resolve'
import babel from 'rollup-plugin-babel'
import uglify from 'rollup-plugin-uglify'
import glsl from 'rollup-plugin-glsl'
import replace from 'rollup-plugin-replace'

export default [

  // bundle UMD ES6
  {
    input: pkg.entry,
    output: {
      file: pkg.es6,
      name: pkg.name,
      sourcemap: true,
      format: 'umd'
    },

    plugins: [
      replace({
        exclude: 'node_modules/**',
        delimiters: ['<@', '@>'],
        APP_NAME: pkg.name,
        APP_VERSION: pkg.version
      }),
      nodeResolve({
        preferBuiltins: false
      }),
      commonjs(),
      globals(),
      builtins(),
      glsl({
        include: 'src/shaders/*.glsl',
      })
    ]
  },

  // bundle UMD ES5
  {
    input: pkg.entry,
    output: {
      file: pkg.main,
      name: pkg.name,
      sourcemap: true,
      format: 'umd'
    },

    plugins: [
      replace({
        exclude: 'node_modules/**',
        delimiters: ['<@', '@>'],
        APP_NAME: pkg.name,
        APP_VERSION: pkg.version
      }),
      nodeResolve({
        preferBuiltins: false
      }),
      commonjs({ include: 'node_modules/**' }), // so Rollup can convert other modules to ES module
      globals(),
      builtins(),
      glsl({
        include: 'src/shaders/*.glsl',
      }),
      babel({
        exclude: 'node_modules/**',
        babelrc: false,
        presets: [ 'es2015-rollup' ]
      })
    ]
  },

  // bundle UMD ES5 MINIFIED
  {
    input: pkg.entry,
    output: {
      file: pkg.min,
      name: pkg.name,
      sourcemap: false,
      format: 'umd'
    },

    plugins: [
      replace({
        exclude: 'node_modules/**',
        delimiters: ['<@', '@>'],
        APP_NAME: pkg.name,
        APP_VERSION: pkg.version
      }),
      nodeResolve({
        preferBuiltins: false
      }),
      commonjs({ include: 'node_modules/**' }), // so Rollup can convert other modules to ES module
      globals(),
      builtins(),
      glsl({
        include: 'src/shaders/*.glsl',
      }),
      babel({
        exclude: 'node_modules/**',
        babelrc: false,
        presets: [ 'es2015-rollup' ]
      }),
      uglify()
    ]
  }

]
