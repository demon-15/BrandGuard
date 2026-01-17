/**
 * Represents a scanned element from the document with color and metadata
 */
export interface ScannedElement {
    id: string;
    type: string;
    fillColor: string | null;
    containerFillColor: string | null;
    fontName: string | null;
    textContent: string | null;
}

// This interface declares all the APIs that the document sandbox runtime ( i.e. code.ts ) exposes to the UI/iframe runtime
export interface DocumentSandboxApi {
    createRectangle(): void;
    scanDocument(): Promise<{ results: ScannedElement[]; violations: any[] }>;
    updateNodeFillById(id: string, hexColor: string): Promise<boolean>;
    fixColor(id: string, hexColor: string): Promise<boolean>;
    fixFont(id: string, fontName: string): Promise<boolean>;
    restoreColor(id: string, hexColor: string): Promise<boolean>;
    restoreFont(id: string, fontName: string): Promise<boolean>;
}
