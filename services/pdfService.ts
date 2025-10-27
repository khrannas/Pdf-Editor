
// Declare PDFLib from CDN
declare const PDFLib: any;
const { PDFDocument, rgb, StandardFonts } = PDFLib;

export async function splitPdf(pdfBytes: ArrayBuffer, splitPage: number) {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const totalPages = pdfDoc.getPageCount();

    if (splitPage <= 0 || splitPage >= totalPages) {
        throw new Error('Invalid split page number.');
    }

    const firstDoc = await PDFDocument.create();
    const secondDoc = await PDFDocument.create();

    const firstPages = await firstDoc.copyPages(pdfDoc, Array.from({ length: splitPage }, (_, i) => i));
    firstPages.forEach(page => firstDoc.addPage(page));

    const secondPages = await secondDoc.copyPages(pdfDoc, Array.from({ length: totalPages - splitPage }, (_, i) => i + splitPage));
    secondPages.forEach(page => secondDoc.addPage(page));

    const firstHalf = await firstDoc.save();
    const secondHalf = await secondDoc.save();

    return { firstHalf, secondHalf };
}

export async function addImageToPdf(pdfBytes: ArrayBuffer, imageBytes: ArrayBuffer, imageType: string, insertAfterPage: number) {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    let image;
    if (imageType === 'image/png') {
        image = await pdfDoc.embedPng(imageBytes);
    } else if (imageType === 'image/jpeg') {
        image = await pdfDoc.embedJpg(imageBytes);
    } else {
        throw new Error('Unsupported image type.');
    }

    const page = pdfDoc.insertPage(insertAfterPage);
    const { width, height } = image.scale(1);
    
    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();
    
    const scale = Math.min(pageWidth / width, pageHeight / height);
    const scaledDims = image.scale(scale);

    page.drawImage(image, {
        x: (pageWidth - scaledDims.width) / 2,
        y: (pageHeight - scaledDims.height) / 2,
        width: scaledDims.width,
        height: scaledDims.height,
    });

    return await pdfDoc.save();
}

export async function addPdfToPdf(originalPdfBytes: ArrayBuffer, newPdfBytes: ArrayBuffer, insertAfterPage: number) {
    const originalDoc = await PDFDocument.load(originalPdfBytes);
    const newDoc = await PDFDocument.load(newPdfBytes);

    const pagesToCopy = await originalDoc.copyPages(newDoc, newDoc.getPageIndices());
    
    pagesToCopy.forEach((page, index) => {
        originalDoc.insertPage(insertAfterPage + index, page);
    });

    return await originalDoc.save();
}

export async function applyDrawingToPdf(pdfBytes: ArrayBuffer, pageNum: number, drawingDataUrl: string) {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const page = pdfDoc.getPage(pageNum - 1);
    
    const drawingImage = await pdfDoc.embedPng(drawingDataUrl);

    page.drawImage(drawingImage, {
        x: 0,
        y: 0,
        width: page.getWidth(),
        height: page.getHeight(),
    });

    return await pdfDoc.save();
}

export async function applyTextEditToPdf(
    pdfBytes: ArrayBuffer, 
    pageNum: number, 
    edits: { x: number; y: number; width: number; height: number; text: string }[]
) {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const page = pdfDoc.getPage(pageNum - 1);
    const { height: pageHeight } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    for (const edit of edits) {
        // Draw a white rectangle to cover the old text
        page.drawRectangle({
            x: edit.x,
            y: pageHeight - edit.y - edit.height,
            width: edit.width,
            height: edit.height,
            color: rgb(1, 1, 1), // White
        });

        // Draw the new text
        // This is a simplified implementation. Real text fitting is complex.
        page.drawText(edit.text, {
            x: edit.x,
            y: pageHeight - edit.y - edit.height,
            font,
            size: edit.height * 0.8, // Approximate font size
            color: rgb(0, 0, 0), // Black
        });
    }

    return await pdfDoc.save();
}

export async function removePageFromPdf(pdfBytes: ArrayBuffer, pageToRemove: number) {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const totalPages = pdfDoc.getPageCount();

    if (pageToRemove <= 0 || pageToRemove > totalPages) {
        throw new Error('Invalid page number to remove.');
    }
    
    if (totalPages === 1) {
        throw new Error('Cannot remove the only page of a document.');
    }

    // pdf-lib is 0-indexed, our app is 1-indexed
    pdfDoc.removePage(pageToRemove - 1);

    return await pdfDoc.save();
}
