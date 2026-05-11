// config.js — auto-detects the API server address
// Works on localhost AND on any device on the same network

var API = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000'
  : 'http://192.168.3.104:3000';
