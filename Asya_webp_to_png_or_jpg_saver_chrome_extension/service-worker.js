const MENU_PNG = "save-image-as-png";
const MENU_JPG = "save-image-as-jpg";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_PNG,
    title: "Save image as PNG",
    contexts: ["image"]
  });

  chrome.contextMenus.create({
    id: MENU_JPG,
    title: "Save image as JPG",
    contexts: ["image"]
  });
});

async function createOffscreenDocument() {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [chrome.runtime.getURL("offscreen.html")]
  });

  if (existingContexts.length > 0) {
    return;
  }

  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["BLOBS"],
    justification: "Convert downloaded images using canvas"
  });
}

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (
    info.menuItemId !== MENU_PNG &&
    info.menuItemId !== MENU_JPG
  ) {
    return;
  }

  if (!info.srcUrl) {
    return;
  }

  const format = info.menuItemId === MENU_PNG ? "png" : "jpeg";

  try {
    await createOffscreenDocument();

    const result = await chrome.runtime.sendMessage({
      type: "convert-image",
      imageUrl: info.srcUrl,
      format
    });

    if (!result || !result.success) {
      throw new Error(result?.error || "Image conversion failed");
    }

    const originalName = getFileName(info.srcUrl);
    const baseName = originalName.replace(/\.[^/.]+$/, "") || "image";
    const extension = format === "png" ? "png" : "jpg";

    await chrome.downloads.download({
      url: result.dataUrl,
      filename: `${baseName}.${extension}`,
      saveAs: true
    });
  } catch (error) {
    console.error("Could not convert image:", error);
  }
});

function getFileName(imageUrl) {
  try {
    const url = new URL(imageUrl);
    const name = decodeURIComponent(
      url.pathname.split("/").pop() || "image"
    );

    return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
  } catch {
    return "image";
  }
}