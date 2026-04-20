import { AbstractWindow } from "../window-manager/AbstractWindow";
import { resourceService } from "../services/resource-service";

export class AboutWindow extends AbstractWindow {
  constructor() {
    super({
      name: "about",
      preload: resourceService.getPreloadScript("about"),
      windowOptions: {
        width: 480,
        height: 360,
        resizable: false,
      },
    });
  }

  protected getHtmlFileName(): string {
    return "about/index.html";
  }
}
