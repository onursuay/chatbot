"use client"

function normalizeExtractedText(text: string) {
  return text
    .normalize("NFKC")
    .replace(/\u0000/g, " ")
    .replace(/\u00ad/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

export async function extractPdfTextClient(file: File, maxLength = 10000) {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs")
  const buffer = new Uint8Array(await file.arrayBuffer())
  const loadingTask = pdfjsLib.getDocument({
    data: buffer,
    useSystemFonts: true,
    disableFontFace: true,
    isEvalSupported: false,
    useWorkerFetch: false,
    stopAtErrors: false,
    disableWorker: true,
  } as any)
  const pdf = await loadingTask.promise

  try {
    const pages: string[] = []

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)

      try {
        const textContent = await page.getTextContent({ disableNormalization: false })
        const chunks: string[] = []
        let previousY: number | null = null

        for (const item of textContent.items) {
          if (!("str" in item)) continue

          const rawText = item.str || ""
          const text = rawText.trim()
          const y = Array.isArray(item.transform) ? Number(item.transform[5]) : null

          if (text) {
            if (previousY !== null && y !== null && Math.abs(previousY - y) > 4) {
              chunks.push("\n")
            } else if (chunks.length > 0 && !chunks[chunks.length - 1].endsWith("\n")) {
              chunks.push(" ")
            }

            chunks.push(rawText)
          }

          if (item.hasEOL) {
            chunks.push("\n")
          }

          if (y !== null) {
            previousY = y
          }
        }

        const pageText = normalizeExtractedText(chunks.join(""))
        if (pageText) {
          pages.push(pageText)
        }
      } finally {
        page.cleanup()
      }
    }

    const extractedText = normalizeExtractedText(pages.join("\n\n"))
    if (!extractedText) {
      throw new Error(
        "PDF içinde seçilebilir metin bulunamadı. Taranmış veya görsel tabanlı PDF'ler desteklenmez."
      )
    }

    return extractedText.substring(0, maxLength)
  } finally {
    await pdf.destroy()
  }
}
