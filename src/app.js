const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const routes = require('./routes');
const errorHandler = require('./middleware/errorMiddleware');
const { setupSwagger } = require('./swagger');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

setupSwagger(app);

app.use('/api', routes);

app.use(errorHandler);

module.exports = app;