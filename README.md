## Introduction

This is a fork from [Media Extended](https://github.com/aidenlx/media-extended). 

My goal is to enchance the experience of taking notes from YouTube videos, I've attempted many plugins to achieve the functionality of inserting timestamp link and navigating video through transcripts... Then I've found `Media-Extend` and `obsidian-yt-transcript`, but they can not work together, both of the two plugins have remain unmaintained for a long time, so I decide fork the `Media-Extend` and integrate `obsidian-yt-transcript`.

## Demo
<img width="1280" alt="Snipaste_2024-01-16_19-54-17" src="https://github.com/bfcs/media-extended/assets/52602045/359b007d-abe9-4e52-8fcb-e22f14851178">


## What changes

This changes are primarily based on my experiance using YouTube, and may not be suitable for everyone.

1. Completely unbind the video player from note editor, allowing you to open multiple video player windows simultaneously and insert video timestamps from different videos into a single note. **Note these timestamps look the same but leed to different videos**. In the original repository, one video player is bound to one editor using a feature call `group` in Obsidian, resulting in the creation of  a new editor view each time you swtich between live view mode and reading view mode.
2. Add support for YouTube transcripts, this feature is from another plugin [obsidian-yt-transcript](https://github.com/lstrzepek/obsidian-yt-transcript). Other types of video transcripts are not supported.
3. Instead of using dragging, I enable text selection. This could be more useful in times when you just want to choose portion of the text. Moreover, enabling text selection also allows you to perform additional operations, such as looking up selection in the built-in dictionary on MacOS.
4. Navigate through the video by clicking on timestamps in transcript panel.
5. Insert a normal timestamp link into active editor using the template you've configured in settings.
6. Insert a loop timestamp link into active editor using the template you've configured in settings.
7. Hide/unhide a couple lines of transcrips or all transcrips. This serves as a secret weapon for language listening practice.
8. Play the video in a loop within the time range of the chosen transcript. 
9. Copy a single transcript or all transcripts

## Workaround

The original repository uses `MarkdownPostProcessor` to implement the feature of navigating videos through timestamps, so timestamp link could only lead to video in the reading view, otherwise it will  result in opening the default browser. There is workaround, put the timestamp link inside a component that will be rendered in live view, like callout.

<img width="713" alt="image" src="https://github.com/bfcs/media-extended/assets/52602045/a62a3c5e-0de5-4631-ac19-3078462f12f0">

## Warning

1. Because I append many elements after each transcript, if the video is very long and transcript density is too high, it may wait for a few minutes for the transcrips to render. Increase the lines of every transcript in settings would help.
2. Before performing the insertion operation, ensure your mouse cursor is in the correct position.
3. There would be multiple media player windows simultaneously, before executing the commands on a specific video, you need to set the media window as active first by click on the blank space.

## How to use

1. Uninstall the old `Media-Extend` plugin first as they are essentially the same plugin.
2. Download the zip file from the release page and place the uncompressed folder in the Obsidian plugin folder.   
3. Reload Obsidian.
4. If you still open the default browser at the beginning, switch to another note and then switch back.

## Future
The `Media-Extend` plugin v3 is under developement and Obsidian API version in the current version is too old. Therefore, putting much effort into it may not be worthwhile. However, if you have any issues, feel free to submit them.

Star or watch the fork to reveice further updates.
