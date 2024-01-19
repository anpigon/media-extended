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

## Templater

The template below assists in creating a note with the name corresponding to the tilte of a YouTube video, It fetch the YouTube link from your cliboard, get the video title. rename the new note with title, and then insert a link leading to the media player. Set this template as the default for a specific folder in the Templater settings. Each time you right-click on the folder and choose to create a note, the template will be applied.

<img width="745" alt="image" src="https://github.com/bfcs/media-extended/assets/52602045/d58e133d-3911-45f7-b9e1-f9d6201ef119">

```javascript

<%* 
const url = await tp.system.clipboard();

if (!url.startsWith('https') || !url.includes('youtube')){
	console.log('invalid youtube link: ', url)
	return;
}
let title = await tp.user.get_link_title(tp);
const regex = /[|\\\/]/g; 
title = title.replace(regex, '-').replace(":", " -");
// 去掉- YouTube
title = title.slice(0, -10);
const titleWithDate = `<${tp.date.now()}>${title}`

tR += `>[!example] [${title}](${url})`;

if (title.length > 200) {
	title = await tp.system.prompt("Name is too long", title, true)
}
await tp.file.rename(titleWithDate);

%>

```
The template uses a user function called get_link_title, do not forget to add it.

```javascript


function blank(text) {
  return text === undefined || text === null || text === ''
}

function notBlank(text) {
  return !blank(text)
}

async function scrape(url, requestUrl) {
  try {
    const response = await requestUrl(url)
    if (!response.headers['content-type'].includes('text/html')) return getUrlFinalSegment(url)
    const html = response.text

    const doc = new DOMParser().parseFromString(html, 'text/html')
    const title = doc.querySelector('title')

    if (blank(title?.innerText)) {
      // If site is javascript based and has a no-title attribute when unloaded, use it.
      var noTitle = title?.getAttr('no-title')
      if (notBlank(noTitle)) {
        return noTitle
      }

      // Otherwise if the site has no title/requires javascript simply return Title Unknown
      return url
    }

    return title.innerText
  } catch (ex) {
    console.error(ex)
    return 'Site Unreachable'
  }
}

function getUrlFinalSegment(url) {
  try {
    const segments = new URL(url).pathname.split('/')
    const last = segments.pop() || segments.pop() // Handle potential trailing slash
    return last
  } catch (_) {
    return 'File'
  }
}

async function getPageTitle(tp) {
  let url = await tp.system.clipboard();
  if (!(url.startsWith('http') || url.startsWith('https'))) {
    console.log('invalid link: ', url)
    return ;
  }
  return scrape(url, tp.obsidian.requestUrl)
}

module.exports = getPageTitle;
```


## Future
The `Media-Extend` plugin v3 is under developement and Obsidian API version in the current version is too old. Therefore, putting much effort into it may not be worthwhile. However, if you have any issues, feel free to submit them.

Star or watch the fork to reveice further updates.
