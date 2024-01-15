import "plyr/dist/plyr.css";
import "./style/main.less";
import "./style/ytb.less";
import "./style/caption-fix.less";
import "./style/yt-transcript.less";

import assertNever from "assert-never";
import { MarkdownView, Plugin, WorkspaceLeaf } from "obsidian";

import { getEmbedProcessor } from "./embeds";
import { getCMLinkHandler, getLinkProcessor } from "./links";
import { MEDIA_VIEW_TYPE, MediaView, PromptModal } from "./media-view";
import { setupRec } from "./modules/audio-rec";
import { acceptedExt } from "./modules/media-info";
import {
  DEFAULT_SETTINGS,
  hideYtbRecommClass,
  MESettingTab,
  MxSettings,
  SizeSettings,
} from "./settings";
import {
  TRANSCRIPT_TYPE_VIEW,
  TranscriptView,
} from "./yt-transcript/transcript-view";

const linkSelector = "span.cm-url, span.cm-hmd-internal-link";
export default class MediaExtended extends Plugin {
  settings: MxSettings = DEFAULT_SETTINGS;

  recStartTime: number | null = null;

  currentEditorLeaf?: WorkspaceLeaf;

  currentMediaPlayLeaf?: WorkspaceLeaf;

  private cmLinkHandler = getCMLinkHandler(this);

  async loadSettings() {
    this.settings = { ...this.settings, ...(await this.loadData()) };
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  setEmbedMinWidth = (value?: string) =>
    document.documentElement.style.setProperty(
      "--plyr-min-width",
      value ?? this.sizeSettings.embedMinWidth,
    );

  get sizeSettings() {
    return {
      embedMaxHeight: this.app.isMobile
        ? this.settings.embedMaxHeightMobile
        : this.settings.embedMaxHeight,
      embedMinWidth: this.app.isMobile
        ? this.settings.embedMinWidthMobile
        : this.settings.embedMinWidth,
      plyrControls: this.app.isMobile
        ? this.settings.plyrControlsMobile
        : this.settings.plyrControls,
    };
  }

  setSizeSettings = async (to: Partial<SizeSettings>): Promise<void> => {
    let save: Partial<MxSettings>;
    if (this.app.isMobile) {
      save = {
        embedMaxHeightMobile: to.embedMaxHeight,
        embedMinWidthMobile: to.embedMinWidth,
        plyrControlsMobile: to.plyrControls,
      };
    } else {
      save = to;
    }
    const mergeObject = (A: any, B: any) => {
      let res: any = {};
      Object.keys({ ...A, ...B }).map((key) => {
        res[key] = B[key] || A[key];
      });
      return res;
    };
    this.settings = mergeObject(this.settings, save);
    await this.saveSettings();
  };

  async onload(): Promise<void> {
    console.log("loading media-extended");

    this.currentMediaPlayLeaf =
      this.app.workspace.getLeavesOfType(MEDIA_VIEW_TYPE)[0];

    this.app.workspace
      .getLeavesOfType(TRANSCRIPT_TYPE_VIEW)
      .forEach((l) => l.detach());

    this.currentEditorLeaf = this.app.workspace.getLeavesOfType("markdown")[0];

    await this.loadSettings();

    // open a media player won't active it, so can not modify from here
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", (leaf) => {
        if (leaf && "markdown" === leaf.view.getViewType()) {
          console.log("markdown leaf change: ", leaf.view.getViewType());
          this.currentEditorLeaf = leaf;
        }
      }),
    );

    setupRec.call(this);

    document.body.toggleClass(hideYtbRecommClass, this.settings.hideYtbRecomm);
    this.setEmbedMinWidth();

    this.addSettingTab(new MESettingTab(this.app, this));

    // register embed handlers
    if (this.settings.mediaFragmentsEmbed) {
      this.registerMarkdownPostProcessor(getEmbedProcessor(this, "internal"));
    }
    if (this.settings.timestampLink) {
      this.registerMarkdownPostProcessor(getLinkProcessor(this, "internal"));
    }

    // register link handlers
    if (this.settings.extendedImageEmbedSyntax) {
      this.registerMarkdownPostProcessor(getEmbedProcessor(this, "external"));
    }
    this.registerMarkdownPostProcessor(getLinkProcessor(this, "external"));

    if (!this.app.isMobile) {
      this.registerCodeMirror((cm) => {
        const warpEl = cm.getWrapperElement();
        warpEl.on("mousedown", linkSelector, this.cmLinkHandler);
        this.register(() =>
          warpEl.off("mousedown", linkSelector, this.cmLinkHandler),
        );
      });
    }

    this.registerExtensions();

    this.addCommand({
      id: "get-timestamp",
      name: "Get timestamp from player",
      callback: () => {
        (this.currentMediaPlayLeaf?.view as MediaView).addTimeStampToMDView(
          this.currentEditorLeaf?.view as MarkdownView,
        );
      },
    });

    this.addCommand({
      id: "open-media-link",
      name: "Open Media from Link",
      callback: () => {
        new PromptModal(this).open();
      },
    });
  }

  registerExtensions() {
    const exts = getExts();
    this.app.viewRegistry.unregisterExtensions(exts);
    this.registerView(MEDIA_VIEW_TYPE, (leaf) => new MediaView(leaf, this));

    this.registerView(
      TRANSCRIPT_TYPE_VIEW,
      (leaf) => new TranscriptView(leaf, this),
    );

    this.app.viewRegistry.registerExtensions(exts, MEDIA_VIEW_TYPE);
  }

  unregisterExtensions() {
    this.app.viewRegistry.unregisterExtensions(getExts());
    for (const [type, exts] of acceptedExt) {
      switch (type) {
        case "audio":
        case "video":
          this.app.viewRegistry.registerExtensions(exts, type);
          break;
        case "media":
          this.app.viewRegistry.registerExtensions(exts, "video");
          break;
        default:
          assertNever(type);
      }
    }
    this.app.workspace.detachLeavesOfType(TRANSCRIPT_TYPE_VIEW);
  }

  onunload() {
    console.log("unloading media-extended");
    this.unregisterExtensions();
  }
}

const getExts = () =>
  [...acceptedExt.values()].reduce((acc, val) => acc.concat(val), []);
