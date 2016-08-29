// babel to allow es6 in main app.js
require("babel-polyfill");
require("babel-register")({
  "presets": [
    "es2015"
  ] 
});


// load app (es6)
var app = require("./app.js");
