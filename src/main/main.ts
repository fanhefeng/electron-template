import { MainApp } from './MainApp';
import { logger } from './services/logger-service';

const mainApp = new MainApp();

mainApp
  .init()
  .then(() => logger.info('Application initialized'))
  .catch((error) => {
    logger.error('Failed to initialize application', error);
    process.exit(1);
  });
