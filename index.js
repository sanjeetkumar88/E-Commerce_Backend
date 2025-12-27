import dotenv from 'dotenv';
dotenv.config();

import "./src/config/env.js"
import app from './app.js';
import connectDB from './src/config/db.js'; 

const PORT = process.env.PORT || 8000;


connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to connect to database:', error.message);
    process.exit(1);
  });

