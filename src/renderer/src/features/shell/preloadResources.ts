export async function preloadAppResources(): Promise<void> {
  await Promise.allSettled([
    document.fonts.load('600 28px "Anek Tamil"', 'வணக்கம் வேதாகம நண்பன்'),
    document.fonts.load('400 16px "Anek Tamil"', 'வேதாகம நண்பன்'),
    ...Array.from(document.images, (image) => image.decode())
  ])
  await document.fonts.ready
}
