/** Recorta a imagem em quadrado (centralizado) e reduz para `size` px, devolvendo um JPEG leve. */
export function resizeImageToSquare(file: File, size = 256, quality = 0.9): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      if (!side) return reject(new Error("Imagem inválida."));
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Seu navegador não suporta o processamento da imagem."));
      // Fundo branco para PNGs/GIFs com transparência
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      const sx = (img.naturalWidth - side) / 2;
      const sy = (img.naturalHeight - side) / 2;
      ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Não foi possível processar a imagem."))),
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler a imagem. Tente outro arquivo (JPG, PNG ou WebP)."));
    };
    img.src = url;
  });
}
