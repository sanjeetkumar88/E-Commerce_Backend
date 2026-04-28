import swaggerAutogen from 'swagger-autogen';

const doc = {
  info: {
    title: 'Sinnora E-commerce API',
    description: 'Auto-generated API Documentation',
  },
  host: 'localhost:3000',
  schemes: ['http', 'https'],
  basePath: '/',
  securityDefinitions: {
    bearerAuth: {
      type: 'apiKey',
      in: 'header',
      name: 'Authorization',
      description: 'Enter your Bearer token in the format **Bearer &lt;token>**',
    }
  }
};

const outputFile = './swagger_output.json';
// Pointing it to the main entry file where your routes are registered
const endpointsFiles = ['./app.js']; 

swaggerAutogen()(outputFile, endpointsFiles, doc).then(() => {
    console.log("Swagger documentation generated successfully!");
});
