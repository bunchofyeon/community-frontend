const path = require('path');
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

// ✅ 루트("/") 접속 시 로그인 페이지로 리다이렉트
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

// 보안, 압축, 로그 미들웨어
app.use(helmet());
app.use(compression());
app.use(morgan('dev'));

// 정적 파일 서빙
app.use(express.static(path.join(__dirname), {
  index: 'index.html',
  extensions: ['html'],
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store');
  },
}));

// API 프록시 (프론트 → 백엔드)
app.use('/api', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  pathRewrite: { '^/api': '' },
}));

// 서버 시작
app.listen(PORT, () => {
  console.log(`[frontend] http://localhost:${PORT} (proxy -> ${BACKEND_URL})`);
});