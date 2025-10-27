
export type EditorTool = 'view' | 'draw' | 'edit';

// This is a simplified type for the PDF.js document proxy object
export interface PDFDoc {
    numPages: number;
    getPage: (pageNumber: number) => Promise<any>;
}

export interface TextBlock {
    text: string;
    boundingBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
}
