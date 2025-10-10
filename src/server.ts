import express from 'express';
import dotenv from 'dotenv';
import router from './routes/auth.routes';
import { swaggerDocs } from './config/swagger';

dotenv.config();

const app = express();
app.use(express.json());

app.use('/api/auth', router);

swaggerDocs(app);    

const PORT = process.env.PORT || 3005;
app.listen(PORT, () =>{
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`Swagger disponible sur http://localhost:${PORT}/api-docs`);
});