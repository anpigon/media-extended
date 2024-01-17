import MediaExtended from "mx-main";
import {
  MarkdownPostProcessor,
  MarkdownView,
  parseLinktext,
  WorkspaceLeaf,
} from "obsidian";

import { MEDIA_VIEW_TYPE, MediaView, openNewView } from "./media-view";
import { Await } from "./misc";
import { isAvailable } from "./modules/bili-bridge";
import {
  getMediaInfo,
  getMediaType,
  Host,
  isHost,
  mediaInfo,
  resolveInfo,
} from "./modules/media-info";

type evtHandler = (e: Event) => void;

export const getOpenLink = (
  info: mediaInfo,
  plugin: MediaExtended,
): evtHandler => {
  const { workspace } = plugin.app;
  return (e) => {
    if (
      isHost(info) &&
      info.host === Host.bili &&
      (!isAvailable(plugin.app) || !plugin.settings.interalBiliPlayback)
    )
      return;
    e.stopPropagation();
    e.preventDefault();

    const mediaLeafs = workspace.getLeavesOfType(MEDIA_VIEW_TYPE);

    let leafEsists = false;
    let view: MediaView;

    for (let mediaLeaf of mediaLeafs) {
      const mediaView = mediaLeaf.view as MediaView;
      if (
        MEDIA_VIEW_TYPE === mediaView.getViewType() &&
        mediaView.isEqual(info)
      ) {
        leafEsists = true;
        view = mediaView;
      }
    }

    if (leafEsists) {
      const isInfoEqual = view.isEqual(info);
      view.setInfo(info).then(() => {
        if (!view.core) return;
        const { player } = view.core;
        if (isInfoEqual) {
          player.play();
        } else {
          if (!isHost(info) && info.type === "media" && player.isHTML5) {
            player.once("ready", function () {
              const promise = this.play();
              let count = 0;
              if (promise) {
                promise.catch((e) => {
                  const message =
                    "The play() request was interrupted by a new load request";
                  if (count === 0 && (e.message as string)?.includes(message)) {
                    console.warn(e);
                    count++;
                  } else console.error(e);
                });
              }
            });
          } else
            player.once("ready", function () {
              this.play();
            });
        }
      });
    } else {
      openNewView(info, plugin);
    }
  };
};

export const getLinkProcessor = (
  plugin: MediaExtended,
  type: "internal" | "external",
): MarkdownPostProcessor => {
  let selector = type === "internal" ? "a.internal-link" : "a.external-link";
  selector = selector + ", a.auto-card-link-card";
  return (secEl, ctx) => {
    secEl.querySelectorAll(selector).forEach(async (el) => {
      const anchor = el as HTMLAnchorElement;
      const info = await resolveInfo(anchor, type, plugin.app, ctx);
      if (!info) return;
      plugin.registerDomEvent(anchor, "click", getOpenLink(info, plugin));
    });
  };
};

export const getCMLinkHandler = (plugin: MediaExtended) => {
  const { workspace, metadataCache, vault } = plugin.app;
  return async (e: MouseEvent, del: HTMLElement) => {
    const text = del.innerText;
    const isMacOS = /Macintosh|iPhone/.test(navigator.userAgent);
    const modKey = isMacOS ? e.metaKey : e.ctrlKey;
    if (modKey) {
      let info: Await<ReturnType<typeof getMediaInfo>>;
      if (del.hasClass("cm-hmd-internal-link")) {
        const { path, subpath: hash } = parseLinktext(text);

        if (!getMediaType(path)) return;
        else e.stopPropagation();

        const activeLeaf = workspace.getActiveViewOfType(MarkdownView);
        if (!activeLeaf) {
          console.error("no MarkdownView activeLeaf found");
          return;
        }
        const file = metadataCache.getFirstLinkpathDest(
          path,
          activeLeaf.file.path,
        );
        if (!file) return;
        info = await getMediaInfo(file, hash);
      } else {
        if (
          del.hasClass("cm-formatting") &&
          del.hasClass("cm-formatting-link-string")
        ) {
          let urlEl: Element | null;
          if (text === "(") urlEl = del.nextElementSibling;
          else if (text === ")") urlEl = del.previousElementSibling;
          else urlEl = null;
          if (urlEl === null || !(urlEl instanceof HTMLElement)) {
            console.error("unable to get url from: %o", del);
            return;
          }
          info = await getMediaInfo(urlEl.innerText);
        } else {
          info = await getMediaInfo(text);
        }
      }

      try {
        if (info) getOpenLink(info, plugin)(e);
      } catch (e) {
        console.error(e);
      }
    }
  };
};

export function isYouTubeUrl(url: string): boolean {
  // YouTube 视频链接的正则表达式
  const youtubeRegex =
    /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})$/;

  return youtubeRegex.test(url);
}
