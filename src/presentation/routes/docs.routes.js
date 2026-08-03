import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from '../openapi/openapiSpec.js';

const router = Router();

router.get('/api-docs.json', (_req, res) => {
  res.json(openApiSpec);
});

router.use('/api-docs', (_req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    'default-src \'self\'; script-src \'self\' \'unsafe-inline\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data:; font-src \'self\' data:',
  );
  next();
}, swaggerUi.serve, swaggerUi.setup(openApiSpec, {
  explorer: true,
  customSiteTitle: 'SpeedCubers Pulse API Docs',
}));

export default router;
