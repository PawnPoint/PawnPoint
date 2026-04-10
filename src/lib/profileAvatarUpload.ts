function loadImageFromUrl(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read the selected image."));
    image.src = url;
  });
}

export async function optimizeProfileAvatarFile(file: File, outputSize = 384): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImageFromUrl(objectUrl);
    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas is not available for avatar processing.");
    }

    const scale = Math.max(outputSize / image.naturalWidth, outputSize / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    const offsetX = (outputSize - drawWidth) / 2;
    const offsetY = (outputSize - drawHeight) / 2;

    context.clearRect(0, 0, outputSize, outputSize);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

    return canvas.toDataURL("image/webp", 0.86);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
