import { AbstractWindow } from "../window-manager/AbstractWindow";
import { resourceService } from "../services/resource-service";

export class MainWindow extends AbstractWindow {
  constructor() {
    super({
      name: "main",
      preload: resourceService.getPreloadScript("main"),
    });
  }

  protected getHtmlFileName(): string {
    return "main/index.html";
  }
}
