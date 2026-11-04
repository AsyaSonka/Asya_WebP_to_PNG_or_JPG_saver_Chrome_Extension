chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "convert-image") {
    return;
  }

  convertImage(message.imageUrl, message.format)
    .then((dataUrl) => {
      sendResponse({
        success: true,
        dataUrl
      });
    })
    .catch((error) => {
      console.error(error);

      sendResponse({
        success: false,
        error: error.message
      });
    });

  return true;
});

async function convertImage(imageUrl, format) {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}`);
  }

  const blob = await response.blob();

  const bitmap = await createImageBitmap(blob);

  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;

  const context = canvas.getContext("2d");

  // JPG does not support transparency.
  // Fill transparent areas with white.
  if (format === "jpeg") {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  context.drawImage(bitmap, 0, 0);
  bitmap.close();

  if (format === "png") {
    return canvas.toDataURL("image/png");
  }

  // JPEG quality: 0.92
  return canvas.toDataURL("image/jpeg", 0.92);
}