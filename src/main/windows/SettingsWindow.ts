import { AbstractWindow } from '../window-manager/AbstractWindow';
import { resourceService } from '../services/resource-service';

export class SettingsWindow extends AbstractWindow {
  constructor() {
    super({
      name: 'settings',
      preload: resourceService.getPreloadScript('settings'),
      url: 'http://localhost:5173/settings/index.html',
      windowOptions: {
        width: 640,
        height: 480
      }
    });
  }

  protected getHtmlFileName(): string {
    return 'settings/index.html';
  }
}
