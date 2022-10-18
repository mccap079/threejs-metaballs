1. `npm init -y`
2. Add `"private": true,` param to package.json and rename "name" param
3. `npm install webpack webpack-cli --save-dev` for webpack
4. `npm install --save three` for threejs
5. `npm install webpack-dev-server --save-dev` for live reloading
5. Write js code in src/index.js
 - To include threejs modules, use its path relative to its place in the three-js-repo (i.e., `import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';`)
6. Write html code in dist/index.html
7. `npx webpack serve` to build or `npx webpack serve --no-client-overlay --live-reload` to serve on localhost with no error msg overlay and live reloading
8. Upload contents of dist/ to web server