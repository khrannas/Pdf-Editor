
import React, { useState } from 'react';
import type { EditorTool } from '../types';
import { ViewIcon, DrawIcon, EditIcon, SplitIcon, AddPageIcon, DownloadIcon, RemovePageIcon } from './icons';
import { Modal } from './Modal';

interface ToolbarProps {
    activeTool: EditorTool;
    onToolChange: (tool: EditorTool) => void;
    onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onSplit: (page: number) => void;
    onAddPage: (file: File) => void;
    onRemovePage: () => void;
    onDownload: () => void;
    isPdfLoaded: boolean;
    totalPages: number;
    currentPage: number;
}

export const Toolbar: React.FC<ToolbarProps> = ({ activeTool, onToolChange, onFileChange, onSplit, onAddPage, onRemovePage, onDownload, isPdfLoaded, totalPages, currentPage }) => {
    const [isSplitModalOpen, setSplitModalOpen] = useState(false);
    const [splitPage, setSplitPage] = useState(1);
    const [isAddPageModalOpen, setAddPageModalOpen] = useState(false);
    const [isRemoveModalOpen, setRemoveModalOpen] = useState(false);

    const handleSplitSubmit = () => {
        onSplit(splitPage);
        setSplitModalOpen(false);
    };
    
    const handleRemoveConfirm = () => {
        onRemovePage();
        setRemoveModalOpen(false);
    };

    const handleAddPageFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onAddPage(file);
            setAddPageModalOpen(false);
        }
    };

    const toolClasses = (tool: EditorTool) => 
        `p-2 rounded-lg flex items-center space-x-2 transition-colors duration-200 ${
            activeTool === tool
            ? 'bg-indigo-600 text-white shadow-md'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
        }`;

    return (
        <>
            <header className="bg-white dark:bg-gray-800 shadow-md p-2 flex items-center justify-between z-10">
                <div className="flex items-center space-x-2">
                    <h1 className="text-xl font-bold text-indigo-600 dark:text-indigo-400 hidden sm:block">Gemini PDF Editor</h1>
                    <label htmlFor="file-upload" className="cursor-pointer bg-indigo-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-600 transition-colors">
                        Open PDF
                    </label>
                    <input id="file-upload" name="file-upload" type="file" accept="application/pdf" className="sr-only" onChange={onFileChange} />
                </div>
                {isPdfLoaded && (
                    <div className="flex items-center space-x-2 md:space-x-4">
                        <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-900 p-1 rounded-lg">
                            <button onClick={() => onToolChange('view')} className={toolClasses('view')} title="View Mode"><ViewIcon /><span className="hidden md:inline">View</span></button>
                            <button onClick={() => onToolChange('draw')} className={toolClasses('draw')} title="Draw"><DrawIcon /><span className="hidden md:inline">Draw</span></button>
                            <button onClick={() => onToolChange('edit')} className={toolClasses('edit')} title="Edit Text (AI)"><EditIcon /><span className="hidden md:inline">Edit</span></button>
                        </div>
                        <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-900 p-1 rounded-lg">
                            <button onClick={() => setSplitModalOpen(true)} className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600" title="Split PDF"><SplitIcon /></button>
                            <button onClick={() => setAddPageModalOpen(true)} className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600" title="Add Page"><AddPageIcon /></button>
                            <button onClick={() => setRemoveModalOpen(true)} className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-red-500 hover:text-white dark:hover:bg-red-600 transition-colors" title="Remove Current Page"><RemovePageIcon /></button>
                        </div>
                        <button onClick={onDownload} className="flex items-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-600 transition-colors" title="Download PDF">
                           <DownloadIcon /> <span className="hidden md:inline">Download</span>
                        </button>
                    </div>
                )}
            </header>
            
            {/* Split Modal */}
            <Modal isOpen={isSplitModalOpen} onClose={() => setSplitModalOpen(false)} title="Split PDF">
                <div className="space-y-4">
                    <p>Select the page where you want to split the document. The document will be split <span className="font-semibold">after</span> this page.</p>
                    <label htmlFor="split-page" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Split after page:</label>
                    <input
                        id="split-page"
                        type="number"
                        value={splitPage}
                        onChange={(e) => setSplitPage(parseInt(e.target.value, 10))}
                        min="1"
                        max={totalPages > 1 ? totalPages - 1 : 1}
                        className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                    <div className="flex justify-end space-x-2 pt-4">
                        <button onClick={() => setSplitModalOpen(false)} className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
                        <button onClick={handleSplitSubmit} className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700">Split</button>
                    </div>
                </div>
            </Modal>

            {/* Add Page Modal */}
            <Modal isOpen={isAddPageModalOpen} onClose={() => setAddPageModalOpen(false)} title="Add Page">
                <div>
                    <p className="mb-4">Select an image (JPEG, PNG) or another PDF file to insert after the current page ({currentPage}).</p>
                    <input
                        type="file"
                        accept="application/pdf,image/jpeg,image/png"
                        onChange={handleAddPageFileSelected}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                </div>
            </Modal>
            
            {/* Remove Page Modal */}
            <Modal isOpen={isRemoveModalOpen} onClose={() => setRemoveModalOpen(false)} title="Remove Page">
                <div className="space-y-4">
                    <p>Are you sure you want to permanently remove page <span className="font-semibold">{currentPage}</span>?</p>
                    <p className="text-sm text-red-600 dark:text-red-400">This action cannot be undone.</p>
                    <div className="flex justify-end space-x-2 pt-4">
                        <button onClick={() => setRemoveModalOpen(false)} className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
                        <button onClick={handleRemoveConfirm} className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700">Remove Page</button>
                    </div>
                </div>
            </Modal>
        </>
    );
};
