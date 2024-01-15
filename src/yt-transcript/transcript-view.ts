import { ItemView, MarkdownView, Menu, Notice, WorkspaceLeaf } from "obsidian";

import { getOpenLink } from "../links";
import { insertToCursor } from "../misc";
import { getMediaInfo, mediaInfo } from "../modules/media-info";
import MediaExtended from "../mx-main";
import { TranscriptResponse, YoutubeTranscript } from "./fetch-transcript";
import { getTranscriptBlocks, highlightText } from "./render-utils";
import { formatTimestamp } from "./timestampt-utils";
import { TranscriptBlock } from "./types";

export const TRANSCRIPT_TYPE_VIEW = "transcript-view";
export class TranscriptView extends ItemView {
  plugin: MediaExtended;
  videoData?: TranscriptResponse[] = [];

  filteredBlocks: TranscriptBlock[] = [];

  dataContainerEl?: HTMLDivElement;

  url: string = "";

  hiden = false;

  constructor(leaf: WorkspaceLeaf, plugin: MediaExtended) {
    super(leaf);
    this.plugin = plugin;
    this.addAction("file-stack", "Copy All Transcripts", () => {
      navigator.clipboard.writeText(
        this.formatContentToPaste(this.url, this.filteredBlocks),
      );
      new Notice("Copied");
    });

    this.addAction("view", "Toggle Transcripts View", () => {
      const transArr = this.dataContainerEl?.getElementsByTagName("p");
      this.hiden = !this.hiden;
      if (transArr && transArr.length > 0) {
        for (let i = 0; i < transArr.length; i++) {
          const p = transArr[i];
          p.hidden = this.hiden;
        }
      }
    });
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h4", { text: "Transcript" });
    // make text selectable
    contentEl.style.userSelect = "text";
  }

  async onClose() {}

  /**
   * Adds a text input to the view content
   */
  private renderSearchInput(
    url: string,
    data: TranscriptResponse,
    timestampMod: number,
  ) {
    const searchInputEl = this.contentEl.createEl("input");
    searchInputEl.type = "text";
    searchInputEl.placeholder = "Search...";
    searchInputEl.style.marginBottom = "20px";
    searchInputEl.addEventListener("input", (e) => {
      const searchFilter = (e.target as HTMLInputElement).value;
      console.log("search str: ", searchFilter);
      this.renderTranscriptionBlocks(data, timestampMod, searchFilter);
    });
  }

  /**
   * Adds a div with the video title to the view content
   * @param title - the title of the video
   */
  private renderVideoTitle(title: string) {
    const titleEl = this.contentEl.createEl("div");
    titleEl.innerHTML = title;
    titleEl.style.fontWeight = "bold";
    titleEl.style.marginBottom = "20px";
  }

  private formatContentToPaste(url: string, blocks: TranscriptBlock[]) {
    return blocks
      .map((block) => {
        const { quote, quoteTimeOffset } = block;
        const href = url + "#t=" + Math.floor(quoteTimeOffset / 1000);
        const formattedBlock = `[${formatTimestamp(
          quoteTimeOffset,
        )}](${href}) ${quote}`;

        return formattedBlock;
      })
      .join("\n");
  }

  /**
   * Add a transcription blocks to the view content
   * @param url - the url of the video
   * @param data - the transcript data
   * @param timestampMod - the number of seconds between each timestamp
   * @param searchValue - the value to search for in the transcript
   */
  private async renderTranscriptionBlocks(
    data: TranscriptResponse,
    timestampMod: number,
    searchValue: string,
  ) {
    this.dataContainerEl?.empty();
    this.dataContainerEl = this.contentEl.createEl("div");

    const transcriptBlocks = getTranscriptBlocks(data.lines, timestampMod);

    //Filter transcript blocks based on
    this.filteredBlocks = transcriptBlocks.filter((block) =>
      block.quote.toLowerCase().includes(searchValue.toLowerCase()),
    );

    for (let i = 0; i < this.filteredBlocks.length; i++) {
      const block = this.filteredBlocks[i];
      const { quote, quoteTimeOffset } = block;

      const blockContainerEl = createEl("div", {
        cls: "yt-transcript__transcript-block",
      });

      // # indicates that navigate inside page
      // the original url has # from timestamp in editor, need to be removed
      const plainUrl = this.url.split("#")[0];
      const currentTimeInSec = quoteTimeOffset / 1000;
      const href = plainUrl + "#t=" + currentTimeInSec;
      const currentFormatedTime = formatTimestamp(quoteTimeOffset);
      const linkEl = createEl("a", {
        text: currentFormatedTime,
        attr: { href },
      });

      const actionEl = createEl("div");
      blockContainerEl.appendChild(actionEl);

      linkEl.style.marginBottom = "5px";
      const info = await getMediaInfo(href);
      this.plugin.registerDomEvent(
        linkEl,
        "click",
        getOpenLink(<mediaInfo>info, this.plugin),
      );

      actionEl.appendChild(linkEl);

      const insertEl = createEl("a");
      insertEl.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus-circle"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>';
      insertEl.style.marginLeft = "10px";
      const insertSVGEl = insertEl.getElementsByTagName("svg")[0];
      insertSVGEl.style.marginBottom = "-2px";
      insertEl.addEventListener("click", (ev) => {
        const timestamp = `[${currentFormatedTime}](${href})`;
        this.addTransToDoc(timestamp, quote);
      });
      actionEl.appendChild(insertEl);

      const nextTimeOffset = this.filteredBlocks[i + 1].quoteTimeOffset;
      const nextTimeInSec = nextTimeOffset / 1000;
      const nextFormatedTime = formatTimestamp(nextTimeOffset);
      const loopTimestamp = `[${currentFormatedTime} - ${nextFormatedTime}](${plainUrl}#loop&t=${currentTimeInSec},${nextTimeInSec})`;
      const insertLoopEl = createEl("a");
      insertLoopEl.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-badge-plus"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><line x1="12" x2="12" y1="8" y2="16"/><line x1="8" x2="16" y1="12" y2="12"/></svg>';
      insertLoopEl.style.marginLeft = "10px";
      const insertLoopSVGEl = insertLoopEl.getElementsByTagName("svg")[0];
      insertLoopSVGEl.style.marginBottom = "-2px";
      insertLoopEl.addEventListener("click", (ev) => {
        console.log("nextFormatedTime", nextFormatedTime);
        this.addTransToDoc(loopTimestamp, quote);
      });
      actionEl.appendChild(insertLoopEl);

      const loopEl = createEl("a");
      loopEl.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-play-circle"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>';
      loopEl.style.marginLeft = "10px";

      const loopSVGEl = loopEl.getElementsByTagName("svg")[0];
      loopSVGEl.style.marginBottom = "-2px";
      const loopUrl = `${plainUrl}#loop&t=${currentTimeInSec},${nextTimeInSec}`;
      const loopInfo = await getMediaInfo(loopUrl);
      this.plugin.registerDomEvent(
        loopEl,
        "click",
        getOpenLink(<mediaInfo>loopInfo, this.plugin),
      );
      actionEl.appendChild(loopEl);

      const hideEl = createEl("a");
      hideEl.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
      const hideSVGEl = hideEl.getElementsByTagName("svg")[0];
      hideEl.style.marginLeft = "8px";
      hideSVGEl.style.marginBottom = "-4px";
      hideEl.addEventListener("click", (ev) => {
        scriptEl.hidden = !scriptEl.hidden;
      });
      actionEl.appendChild(hideEl);

      const copyEl = createEl("a");
      copyEl.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
      const copySVGEl = copyEl.getElementsByTagName("svg")[0];
      copyEl.style.marginLeft = "10px";
      copySVGEl.style.marginBottom = "-2px";
      copyEl.addEventListener("click", (ev) => {
        navigator.clipboard.writeText(scriptEl.textContent ?? "");
        new Notice("Copied");
      });
      actionEl.appendChild(copyEl);

      const scriptEl = blockContainerEl.createEl("p", {
        text: quote,
      });

      //Highlight any match search terms
      if (searchValue !== "") highlightText(scriptEl, searchValue);

      blockContainerEl.appendChild(scriptEl);

      // could be used with draggable = true
      // blockContainerEl.addEventListener("dragstart", (event: DragEvent) => {
      //   // Here you can change the content to fit the timestamp format
      //   event.dataTransfer?.setData("text/html", blockContainerEl.innerHTML);
      // });

      this.dataContainerEl.appendChild(blockContainerEl);
    }
  }

  /**
   * add a checkbox to toggle if draggable
   * @private
   */
  private renderTranscriptDraggableCheckBox() {
    const dragDiv = this.contentEl.createEl("div");
    dragDiv.style.display = "inline-block";
    dragDiv.style.marginLeft = "30px";

    const dragCheckBox = this.contentEl.createEl("input");

    const dragLabel = this.contentEl.createEl("label");
    dragLabel.textContent = "Draggable";
    dragCheckBox.type = "checkbox";
    dragCheckBox.style.marginBottom = "-3px";
    dragCheckBox.style.marginLeft = "5px";
    dragCheckBox.addEventListener("change", (e) => {
      // draggable = dragCheckBox.checked;
      const blocks = this.contentEl.findAll(".yt-transcript__transcript-block");
      blocks.forEach((block) => {
        block.draggable = dragCheckBox.checked;
      });
    });

    dragDiv.appendChild(dragLabel);
    dragDiv.appendChild(dragCheckBox);
  }

  /**
   * Sets the state of the view
   * This is called when the view is loaded
   */
  async setEphemeralState(state: { url: string }): Promise<void> {
    // note this url may have #
    this.url = state.url;

    const { lang, country, timestampLines } = this.plugin.settings;

    try {
      //Get the youtube video title and transcript at the same time
      const data = await YoutubeTranscript.fetchTranscript(this.url, {
        lang,
        country,
      });

      if (!data) throw Error();

      console.log("Transcripts: ", data);

      this.renderVideoTitle(data.title);
      this.renderSearchInput(this.url, data, timestampLines);

      // use botton to insert instead of draging
      // this.renderTranscriptDraggableCheckBox();

      // this.renderAllTranscriptControl();

      if (data.lines.length === 0) {
        new Notice("Empty Lines");
      } else {
        this.renderTranscriptionBlocks(data, timestampLines, "");
      }
    } catch (err: unknown) {
      new Notice("Got Error, Check Console");
      console.log("err: ", err);
    }
  }

  getViewType(): string {
    return TRANSCRIPT_TYPE_VIEW;
  }
  getDisplayText(): string {
    return "YouTube Transcript";
  }
  getIcon(): string {
    return "scroll-text";
  }

  private addTransToDoc = (timestamp: string, subtitle: string) => {
    const template = this.plugin.settings.timestampTemplate;
    const content = template
      .replace(/{{TIMESTAMP}}/g, timestamp)
      .replace(/{{SUBTITLE}}/g, subtitle);
    insertToCursor(
      content,
      this.plugin.currentEditorLeaf?.view as MarkdownView,
    );
    return;
  };
}
