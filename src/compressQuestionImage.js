const MAX_IMAGE_BYTES = 220 * 1024;
const MAX_DIMENSION = 1440;

function imageFromFile(file) {
  if (typeof createImageBitmap === 'function') return createImageBitmap(file);
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Rasmni ochib bo‘lmadi.')); };
    image.src = url;
  });
}

function toBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Rasmni siqib bo‘lmadi.')), 'image/webp', quality);
  });
}

function toDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Rasmni tayyorlab bo‘lmadi.'));
    reader.readAsDataURL(blob);
  });
}

/** Prepare a bounded, optimized data URL before embedding an image in JSON. */
export async function compressQuestionImage(file) {
  const image = await imageFromFile(file);
  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Rasmni tayyorlab bo‘lmadi.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    let blob;
    for (const quality of [0.82, 0.72, 0.62, 0.52]) {
      blob = await toBlob(canvas, quality);
      if (blob.size <= MAX_IMAGE_BYTES) break;
    }
    if (blob.size > MAX_IMAGE_BYTES) throw new Error('Rasmni 220 KB gacha kichraytirib bo‘lmadi. Boshqa rasm tanlang.');
    return await toDataUrl(blob);
  } finally {
    image.close?.();
  }
}

export const MAX_QUESTION_IMAGE_INPUT_BYTES = 10 * 1024 * 1024;

