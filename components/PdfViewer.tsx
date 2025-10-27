
import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { PDFDoc, EditorTool, TextBlock } from '../types';
import { extractTextFromImage } from '../services/geminiService';
import { EditIcon } from './icons';

interface PdfViewerProps {
    pdfDoc: PDFDoc;
    pageNumber: number;
    activeTool: EditorTool;
    onDrawingSave: (drawingDataUrl: string) => void;
    onTextEditSave: (edits: { x: number, y: number, width: number, height: number, text: string }[]) => void;
}

// FIX: Define a named interface for props to avoid TypeScript errors with the 'key' prop in lists.
interface EditableTextAreaProps {
    block: TextBlock;
    scale: number;
    onUpdate: (text: string) => void;
}

// FIX: Explicitly typing the component with React.FC correctly handles React's special 'key' prop, resolving the type error.
const EditableTextArea: React.FC<EditableTextAreaProps> = ({ block, scale, onUpdate }) => {
    const [text, setText] = useState(block.text);
    const { x, y, width, height } = block.boundingBox;

    return (
        <textarea
            value={text}
            onChange={(e) => {
                setText(e.target.value)
                onUpdate(e.target.value)
            }}
            style={{
                position: 'absolute',
                left: `${x * scale}px`,
                top: `${y * scale}px`,
                width: `${width * scale}px`,
                height: `${height * scale}px`,
                fontSize: `${12 * scale}px`, // Approximate font size
                lineHeight: 1.2,
            }}
            className="bg-yellow-200 bg-opacity-70 border-2 border-dashed border-yellow-500 text-black p-0 m-0 resize-none focus:outline-none"
        />
    );
};


export const PdfViewer: React.FC<PdfViewerProps> = ({ pdfDoc, pageNumber, activeTool, onDrawingSave, onTextEditSave }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [scale, setScale] = useState(1);
    const [isEditing, setIsEditing] = useState(false);
    const [textBlocks, setTextBlocks] = useState<TextBlock[]>([]);
    const [editedBlocks, setEditedBlocks] = useState<Map<number, string>>(new Map());
    const [isLoadingAI, setIsLoadingAI] = useState(false);

    const renderPage = useCallback(async (num: number) => {
        if (!pdfDoc) return;

        const page = await pdfDoc.getPage(num);
        const viewport = page.getViewport({ scale: 1.5 }); // Render at a higher quality
        
        const container = containerRef.current;
        const canvas = canvasRef.current;
        const drawingCanvas = drawingCanvasRef.current;
        if (!container || !canvas || !drawingCanvas) return;
        
        const containerWidth = container.clientWidth;
        const newScale = containerWidth / viewport.width;
        setScale(newScale);

        const scaledViewport = page.getViewport({ scale: newScale });
        
        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;
        drawingCanvas.height = scaledViewport.height;
        drawingCanvas.width = scaledViewport.width;
        
        const renderContext = {
            canvasContext: canvas.getContext('2d')!,
            viewport: scaledViewport,
        };
        await page.render(renderContext).promise;

        // Clear drawing canvas when page changes
        const drawCtx = drawingCanvas.getContext('2d');
        if (drawCtx) {
            drawCtx.clearRect(0, 0, drawCtx.canvas.width, drawCtx.canvas.height);
        }
        setIsEditing(false);
        setTextBlocks([]);
        setEditedBlocks(new Map());

    }, [pdfDoc]);

    useEffect(() => {
        renderPage(pageNumber);
    }, [pageNumber, pdfDoc, renderPage]);

    // Drawing logic
    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (activeTool !== 'draw') return;
        const ctx = drawingCanvasRef.current?.getContext('2d');
        if (!ctx) return;
        setIsDrawing(true);
        ctx.beginPath();
        ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || activeTool !== 'draw') return;
        const ctx = drawingCanvasRef.current?.getContext('2d');
        if (!ctx) return;
        ctx.strokeStyle = '#FF0000'; // Red color
        ctx.lineWidth = 3 * scale;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (activeTool !== 'draw') return;
        setIsDrawing(false);
    };

    const handleSaveDrawing = () => {
        const drawingDataUrl = drawingCanvasRef.current?.toDataURL() ?? '';
        onDrawingSave(drawingDataUrl);
    };

    const handleStartAITextEdit = async () => {
        if(!canvasRef.current) return;
        setIsLoadingAI(true);
        try {
            const pageImage = canvasRef.current.toDataURL('image/jpeg', 0.9);
            const blocks = await extractTextFromImage(pageImage);
            setTextBlocks(blocks);
            setIsEditing(true);
        } catch (error) {
            console.error("AI text extraction failed:", error);
            alert("Could not extract text using AI. Please try again.");
        } finally {
            setIsLoadingAI(false);
        }
    };

    const handleSaveTextEdits = () => {
        const editsToSave: { x: number, y: number, width: number, height: number, text: string }[] = [];
        
        editedBlocks.forEach((newText, index) => {
            const originalBlock = textBlocks[index];
            if (originalBlock.text !== newText) {
                const { x, y, width, height } = originalBlock.boundingBox;
                // Important: coordinates must be unscaled back to original PDF points
                const unscaledX = x / 1.5; // using the initial render scale
                const unscaledY = y / 1.5;
                const unscaledWidth = width / 1.5;
                const unscaledHeight = height / 1.5;
                
                editsToSave.push({ x: unscaledX, y: unscaledY, width: unscaledWidth, height: unscaledHeight, text: newText });
            }
        });
        
        onTextEditSave(editsToSave);
        setIsEditing(false);
        setTextBlocks([]);
        setEditedBlocks(new Map());
    };

    return (
        <div ref={containerRef} className="w-full h-full flex items-center justify-center">
            <div className="relative shadow-lg">
                <canvas ref={canvasRef} />
                <canvas 
                    ref={drawingCanvasRef} 
                    className="absolute top-0 left-0"
                    style={{ display: activeTool === 'draw' ? 'block' : 'none', cursor: 'crosshair' }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                />
                 {activeTool === 'edit' && !isEditing && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center">
                        <button onClick={handleStartAITextEdit} disabled={isLoadingAI} className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-indigo-700 transition-transform transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed">
                            {isLoadingAI ? (
                                <>
                                 <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                 <span>Analyzing...</span>
                                </>
                            ) : (
                                <>
                                    <EditIcon />
                                    <span>Analyze Page for Editing</span>
                                </>
                            )}
                        </button>
                        <p className="text-white text-sm mt-4">Use Gemini AI to find and edit text on this page.</p>
                    </div>
                )}
                {isEditing && (
                    <div className="absolute top-0 left-0 w-full h-full">
                        {textBlocks.map((block, index) => (
                           <EditableTextArea 
                                key={index}
                                block={block}
                                scale={scale}
                                onUpdate={(newText) => {
                                    setEditedBlocks(prev => new Map(prev).set(index, newText));
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>
            {activeTool === 'draw' && <button onClick={handleSaveDrawing} className="fixed bottom-10 right-10 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg hover:bg-green-600">Save Drawing</button>}
            {isEditing && <button onClick={handleSaveTextEdits} className="fixed bottom-10 right-10 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg hover:bg-green-600">Save Text Edits</button>}
        </div>
    );
};