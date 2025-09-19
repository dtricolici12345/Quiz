// src/app.js
import express from 'express';
import cookieParser from 'cookie-parser';
import router from './router.js';
import { errorHandler } from './middlewares/error.js';

const app = express();
// парсы
app.use(express.json({ limit: '1mb' })); 
app.use(cookieParser());



// 3) твои роуты
app.use(router);

// 4) перехват кривого JSON (опционально)
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  next(err);
});

// 5) общий обработчик ошибок
app.use(errorHandler);

export default app;
