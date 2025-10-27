
import React, { useState, useCallback, useEffect } from 'react';
import { Toolbar } from './components/Toolbar';
import { ThumbnailSidebar } from './components/ThumbnailSidebar';
import { PdfViewer } from './components/PdfViewer';
import type { EditorTool, PDFDoc } from './types';
import { addImageToPdf, addPdfToPdf, applyDrawingToPdf, applyTextEditToPdf, splitPdf, removePageFromPdf } from './services/pdfService';
import { fileToArrayBuffer } from './utils/fileUtils';

// Declare pdfjsLib from CDN
declare const pdfjsLib: any;

export default function App() {
    const [pdfDoc, setPdfDoc] = useState<PDFDoc | null>(null);
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [totalPages, setTotalPages] = useState<number>(0);
    const [activeTool, setActiveTool] = useState<EditorTool>('view');
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [fileName, setFileName] = useState<string>('');

    useEffect(() => {
        if (pdfDoc) {
            setTotalPages(pdfDoc.numPages);
            if (currentPage > pdfDoc.numPages) {
                setCurrentPage(pdfDoc.numPages);
            }
        } else {
            setTotalPages(0);
            setCurrentPage(1);
        }
    }, [pdfDoc, currentPage]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type === 'application/pdf') {
            setIsProcessing(true);
            setFileName(file.name);
            setPdfFile(file);
            try {
                const arrayBuffer = await fileToArrayBuffer(file);
                const loadingTask = pdfjsLib.getDocument(arrayBuffer);
                const doc = await loadingTask.promise;
                setPdfDoc(doc);
                setCurrentPage(1);
            } catch (error) {
                console.error("Error loading PDF:", error);
                alert("Failed to load PDF. Please try another file.");
            } finally {
                setIsProcessing(false);
            }
        } else {
            alert('Please select a valid PDF file.');
        }
    };

    const handleToolChange = (tool: EditorTool) => {
        setActiveTool(tool);
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handleSplit = async (splitPage: number) => {
        if (!pdfFile || splitPage <= 0 || splitPage >= totalPages) {
            alert('Invalid split page. Must be between 1 and ' + (totalPages - 1));
            return;
        }
        setIsProcessing(true);
        try {
            const pdfBytes = await fileToArrayBuffer(pdfFile);
            // FIX: Corrected destructuring from "first half" to "firstHalf".
            const { firstHalf, secondHalf } = await splitPdf(pdfBytes, splitPage);
            
            const baseName = fileName.replace('.pdf', '');

            // FIX: Corrected variable name from "first half" to "firstHalf".
            const firstBlob = new Blob([firstHalf], { type: 'application/pdf' });
            const secondBlob = new Blob([secondHalf], { type: 'application/pdf' });

            const a1 = document.createElement('a');
            a1.href = URL.createObjectURL(firstBlob);
            a1.download = `${baseName}_1-${splitPage}.pdf`;
            a1.click();
            URL.revokeObjectURL(a1.href);
            
            const a2 = document.createElement('a');
            a2.href = URL.createObjectURL(secondBlob);
            a2.download = `${baseName}_${splitPage + 1}-${totalPages}.pdf`;
            a2.click();
            URL.revokeObjectURL(a2.href);

        } catch (error) {
            console.error("Error splitting PDF:", error);
            alert("Failed to split PDF.");
        } finally {
            setIsProcessing(false);
        }
    };
    
    const reloadPdf = async (pdfBytes: Uint8Array) => {
        const newFile = new Blob([pdfBytes], { type: 'application/pdf' });
        const newFileObject = new File([newFile], fileName, { type: 'application/pdf' });
        setPdfFile(newFileObject);

        const loadingTask = pdfjsLib.getDocument(pdfBytes);
        const doc = await loadingTask.promise;
        setPdfDoc(doc);
    };


    const handleAddPage = async (file: File) => {
        if (!pdfFile) return;
        setIsProcessing(true);
        try {
            const originalPdfBytes = await fileToArrayBuffer(pdfFile);
            const newFileBytes = await fileToArrayBuffer(file);

            let updatedPdfBytes: Uint8Array;

            if (file.type.startsWith('image/')) {
                updatedPdfBytes = await addImageToPdf(originalPdfBytes, newFileBytes, file.type, currentPage);
            } else if (file.type === 'application/pdf') {
                updatedPdfBytes = await addPdfToPdf(originalPdfBytes, newFileBytes, currentPage);
            } else {
                throw new Error("Unsupported file type for adding page.");
            }
            await reloadPdf(updatedPdfBytes);

        } catch (error) {
            console.error("Error adding page:", error);
            alert("Failed to add page from file.");
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleDrawingSave = async (drawingDataUrl: string) => {
        if (!pdfFile) return;
        setIsProcessing(true);
        try {
            const pdfBytes = await fileToArrayBuffer(pdfFile);
            const updatedPdfBytes = await applyDrawingToPdf(pdfBytes, currentPage, drawingDataUrl);
            await reloadPdf(updatedPdfBytes);
        } catch (error) {
            console.error("Error saving drawing:", error);
            alert("Failed to save drawing.");
        } finally {
            setIsProcessing(false);
            setActiveTool('view');
        }
    };

    const handleTextEditSave = async (edits: { x: number, y: number, width: number, height: number, text: string }[]) => {
        if (!pdfFile) return;
        setIsProcessing(true);
        try {
            const pdfBytes = await fileToArrayBuffer(pdfFile);
            const updatedPdfBytes = await applyTextEditToPdf(pdfBytes, currentPage, edits);
            await reloadPdf(updatedPdfBytes);
        } catch (error) {
            console.error("Error saving text edits:", error);
            alert("Failed to save text edits.");
        } finally {
            setIsProcessing(false);
            setActiveTool('view');
        }
    };

    const handleRemovePage = async () => {
        if (!pdfFile || currentPage <= 0 || currentPage > totalPages) {
            alert('Invalid page selected for removal.');
            return;
        }

        if (totalPages === 1) {
            alert('Cannot remove the only page of the document.');
            return;
        }

        setIsProcessing(true);
        try {
            const pdfBytes = await fileToArrayBuffer(pdfFile);
            const updatedPdfBytes = await removePageFromPdf(pdfBytes, currentPage);
            await reloadPdf(updatedPdfBytes);
        } catch (error) {
            console.error("Error removing page:", error);
            alert(`Failed to remove page: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };


    const handleDownload = () => {
        if (pdfFile) {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(pdfFile);
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(a.href);
        }
    };


    return (
        <div className="flex flex-col h-screen font-sans text-gray-800 dark:text-gray-200">
            <Toolbar 
                activeTool={activeTool}
                onToolChange={handleToolChange}
                onFileChange={handleFileChange}
                onSplit={handleSplit}
                onAddPage={handleAddPage}
                onRemovePage={handleRemovePage}
                onDownload={handleDownload}
                isPdfLoaded={!!pdfDoc}
                totalPages={totalPages}
                currentPage={currentPage}
            />
            <div className="flex-1 flex overflow-hidden">
                {pdfDoc ? (
                    <>
                        <ThumbnailSidebar 
                            pdfDoc={pdfDoc}
                            currentPage={currentPage}
                            onPageChange={handlePageChange}
                        />
                        <main className="flex-1 bg-gray-200 dark:bg-gray-800 p-4 overflow-auto">
                            <PdfViewer
                                pdfDoc={pdfDoc}
                                pageNumber={currentPage}
                                activeTool={activeTool}
                                onDrawingSave={handleDrawingSave}
                                onTextEditSave={handleTextEditSave}
                            />
                        </main>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center bg-gray-200 dark:bg-gray-800">
                         <div className="text-center p-8 border-2 border-dashed border-gray-400 dark:border-gray-600 rounded-xl">
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <h2 className="mt-4 text-xl font-semibold text-gray-700 dark:text-gray-300">Welcome to Gemini PDF Editor</h2>
                            <p className="mt-2 text-gray-500 dark:text-gray-400">Please select a PDF file to begin editing.</p>
                            <label htmlFor="file-upload" className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer">
                                Open PDF
                            </label>
                            <input id="file-upload" name="file-upload" type="file" accept="application/pdf" className="sr-only" onChange={handleFileChange} />
                         </div>
                    </div>
                )}
            </div>
             {isProcessing && (
                <div className="absolute inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl flex items-center space-x-4">
                        <svg className="animate-spin h-6 w-6 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-lg font-medium text-gray-700 dark:text-gray-300">Processing...</span>
                    </div>
                </div>
            )}
        </div>
    );
}
