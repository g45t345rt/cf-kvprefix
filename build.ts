import * as esbuild from 'esbuild'
//import pkg from './package.json'
//const dependencies = () => Object.keys(pkg.dependencies)

const formats = {
  'esm': '.mjs',
  'cjs': '.js'
} as { [key in esbuild.Format]: string }

Object.keys(formats).forEach(key => {
  const extension = formats[key]

  esbuild.build({
    entryPoints: [
      './src/index.ts',
      './src/prefix.ts',
      './src/CFApi.ts',
      './src/KVPrefix.ts',
      './src/KVNamespaceApi.ts',
      './src/KVStackFetch.ts'
    ],
    format: key as esbuild.Format,
    outExtension: { '.js': extension },
    outdir: `./dist`
  })
})
