
import React, { useRef, useEffect } from 'react';
import type { PDFDoc } from '../types';

interface ThumbnailSidebarProps {
    pdfDoc: PDFDoc;
    currentPage: number;
    onPageChange: (page: number) => void;
}

const Thumbnail: React.FC<{ pdfDoc: PDFDoc; pageNum: number; isSelected: boolean; onClick: () => void }> = ({ pdfDoc, pageNum, isSelected, onClick }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const renderThumbnail = async () => {
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 0.2 });
            const canvas = canvasRef.current;
            if (!canvas) return;

            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            const renderContext = {
                canvasContext: canvas.getContext('2d')!,
                viewport: viewport,
            };
            await page.render(renderContext).promise;
        };
        renderThumbnail();
    }, [pdfDoc, pageNum]);

    const selectedClasses = isSelected ? 'border-indigo-500 ring-2 ring-indigo-500' : 'border-gray-300 dark:border-gray-600';

    return (
        <div onClick={onClick} className={`p-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors`}>
            <canvas ref={canvasRef} className={`w-full border-2 ${selectedClasses} rounded-md shadow-sm`} />
            <p className={`text-center text-sm mt-1 ${isSelected ? 'font-bold text-indigo-600 dark:text-indigo-400' : ''}`}>{pageNum}</p>
        </div>
    );
};

export const ThumbnailSidebar: React.FC<ThumbnailSidebarProps> = ({ pdfDoc, currentPage, onPageChange }) => {
    const pages = Array.from({ length: pdfDoc.numPages }, (_, i) => i + 1);

    return (
        <aside className="w-48 bg-white dark:bg-gray-800 p-2 overflow-y-auto shadow-lg">
            <div className="space-y-2">
                {pages.map(pageNum => (
                    <Thumbnail
                        key={pageNum}
                        pdfDoc={pdfDoc}
                        pageNum={pageNum}
                        isSelected={pageNum === currentPage}
                        onClick={() => onPageChange(pageNum)}
                    />
                ))}
            </div>
        </aside>
    );
};
