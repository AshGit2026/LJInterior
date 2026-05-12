
/**
 * Utility to compress and convert images to WebP format client-side.
 */
export async function compressAndConvertToWebP(
  file: Blob | File, 
  maxWidth: number = 1920, 
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Resize logic
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas toBlob failed'));
            }
          },
          'image/webp',
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

/**
 * Fetches an image from a URL and converts it to WebP.
 * Note: The URL must support CORS.
 */
export async function convertUrlToWebP(
  url: string,
  maxWidth: number = 1920,
  quality: number = 0.8
): Promise<Blob> {
  const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
  try {
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error(`Proxy error! status: ${response.status}`);
    const blob = await response.blob();
    return compressAndConvertToWebP(blob, maxWidth, quality);
  } catch (error) {
    console.error('convertUrlToWebP via proxy failed:', error);
    throw error;
  }
}
