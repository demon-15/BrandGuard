import addOnSandboxSdk from "add-on-sdk-document-sandbox";
import { editor, fonts } from "express-document-sdk";
import { DocumentSandboxApi, ScannedElement } from "../models/DocumentSandboxApi";
import { isFontAllowed, normalizeFontName, getBrandKit } from "../brandConfig";
import { initializeBrandKit } from "../hooks/useBrandKit";

// Get the document sandbox runtime.
const { runtime } = addOnSandboxSdk.instance;

// Initialize brand kit on startup
initializeBrandKit().catch(err => console.error('Failed to initialize brand kit:', err));

function start(): void {
    // APIs to be exposed to the UI runtime
    // i.e., to the `App.tsx` file of this add-on.
    const sandboxApi: DocumentSandboxApi = {
        createRectangle: () => {
            const rectangle = editor.createRectangle();

            // Define rectangle dimensions.
            rectangle.width = 240;
            rectangle.height = 180;

            // Define rectangle position.
            rectangle.translation = { x: 10, y: 10 };

            // Define rectangle color.
            const color = { red: 0.32, green: 0.34, blue: 0.89, alpha: 1 };

            // Fill the rectangle with the color.
            const rectangleFill = editor.makeColorFill(color);
            rectangle.fill = rectangleFill;

            // Add the rectangle to the document.
            const insertionParent = editor.context.insertionParent;
            insertionParent.children.append(rectangle);
        }
        ,
        scanDocument: async (): Promise<{ results: ScannedElement[]; violations: any[] }> => {
            try {
                const results: ScannedElement[] = [];
                const violations: any[] = []; // Array to store violations
                const currentPage = editor.context.currentPage;

                function extractFillColor(node: any) {
                    function colorToHex(color: any) {
                        if (!color) return null;
                        const r = Math.round((color.red || 0) * 255)
                            .toString(16)
                            .padStart(2, "0")
                            .toUpperCase();
                        const g = Math.round((color.green || 0) * 255)
                            .toString(16)
                            .padStart(2, "0")
                            .toUpperCase();
                        const b = Math.round((color.blue || 0) * 255)
                            .toString(16)
                            .padStart(2, "0")
                            .toUpperCase();
                        const a = Math.round((typeof color.alpha === 'number' ? color.alpha : 1) * 255)
                            .toString(16)
                            .padStart(2, "0")
                            .toUpperCase();
                        return `#${r}${g}${b}${a}`;
                    }

                    try {
                        // If this is a Text node, prefer character style ranges for color
                        if (node && node.type === "Text" && node.fullContent && node.fullContent.characterStyleRanges) {
                            const ranges = node.fullContent.characterStyleRanges;
                            if (ranges && ranges.length > 0) {
                                for (const range of ranges) {
                                    const candidates = [
                                        // a range may have a fill with a color
                                        (range.fill && (range.fill.color || range.fill)) || null,
                                        // some shapes place styles under characterStyle
                                        (range.characterStyle && (range.characterStyle.fill && range.characterStyle.fill.color || range.characterStyle.fillColor)) || null,
                                        // direct color props
                                        range.color || null,
                                        range.fillColor || null,
                                    ];

                                    for (const cand of candidates) {
                                        if (!cand) continue;
                                        const colorObj = cand.color ? cand.color : cand;
                                        const hex = colorToHex(colorObj);
                                        if (hex) return hex;
                                    }
                                }
                            }
                        }

                        // Fallback for non-text nodes
                        if (node && node.fill && node.fill.color) {
                            return colorToHex(node.fill.color);
                        }
                    } catch (e) {}
                    return null;
                }

                function extractContainerFillColor(node: any) {
                    function colorToHex(color: any) {
                        if (!color) return null;
                        const r = Math.round((color.red || 0) * 255)
                            .toString(16)
                            .padStart(2, "0")
                            .toUpperCase();
                        const g = Math.round((color.green || 0) * 255)
                            .toString(16)
                            .padStart(2, "0")
                            .toUpperCase();
                        const b = Math.round((color.blue || 0) * 255)
                            .toString(16)
                            .padStart(2, "0")
                            .toUpperCase();
                        const a = Math.round((typeof color.alpha === 'number' ? color.alpha : 1) * 255)
                            .toString(16)
                            .padStart(2, "0")
                            .toUpperCase();
                        return `#${r}${g}${b}${a}`;
                    }

                    try {
                        let parent = node.parent;
                        while (parent) {
                            if (parent.fill && parent.fill.color) {
                                return colorToHex(parent.fill.color);
                            }
                            parent = parent.parent;
                        }
                    } catch (e) {}
                    return null;
                }

                function extractFontName(node: any) {
                    try {
                        if (node.type === "Text" && node.fullContent && node.fullContent.characterStyleRanges) {
                            const ranges = node.fullContent.characterStyleRanges;
                            if (ranges && ranges.length > 0) {
                                // Look across all ranges to find a font
                                for (const range of ranges) {
                                    // Check direct font property
                                    if (range.font && range.font.family) {
                                        return range.font.family;
                                    }
                                    // Check characterStyle.font?.family
                                    if (range.characterStyle && range.characterStyle.font && range.characterStyle.font.family) {
                                        return range.characterStyle.font.family;
                                    }
                                }
                            }
                        }
                        
                        // Fallback to node's default style properties
                        if (node.type === "Text") {
                            // Check if there's a default font property on the node itself
                            if (node.font && node.font.family) {
                                return node.font.family;
                            }
                            // Check textStyle or style properties
                            if (node.textStyle && node.textStyle.font && node.textStyle.font.family) {
                                return node.textStyle.font.family;
                            }
                            if (node.style && node.style.font && node.style.font.family) {
                                return node.style.font.family;
                            }
                        }
                    } catch (e) {}
                    return null;
                }

                function extractTextContent(node: any) {
                    try {
                        if (node.type === "Text" && node.fullContent) {
                            return node.fullContent.text || null;
                        }
                    } catch (e) {}
                    return null;
                }

                function checkFontViolation(fontName: string | null) {
                    if (fontName && !isFontAllowed(fontName)) {
                        return {
                            type: "Font Brand Violation",
                            message: `Font '${fontName}' is not allowed.`,
                        };
                    }
                    return null;
                }

                function traverse(node: any) {
                    const fontName = extractFontName(node);
                    const violation = checkFontViolation(fontName);
                    if (violation) {
                        violations.push({
                            id: node.id,
                            ...violation,
                        });
                    }

                    results.push({
                        id: node.id,
                        type: node.type,
                        fillColor: extractFillColor(node),
                        containerFillColor: extractContainerFillColor(node),
                        fontName: fontName,
                        textContent: extractTextContent(node),
                    });

                    const children = (node.allChildren && node.allChildren.length) ? node.allChildren : (node.children && node.children.length ? node.children : []);
                    for (const child of children) {
                        traverse(child);
                    }
                }

                for (const artboard of currentPage.artboards) {
                    traverse(artboard);
                }

                return { results, violations }; // Return both results and violations
            } catch (err) {
                console.error("scanDocument error", err);
                return { results: [], violations: [] };
            }
        }
        ,
        updateNodeFillById: async (id: string, hexColor: string) => {
            try {
                const currentPage = editor.context.currentPage;

                function findById(node: any, targetId: string): any | null {
                    if (!node) return null;
                    if (node.id === targetId) return node;
                    const children = (node.allChildren && node.allChildren.length) ? node.allChildren : (node.children && node.children.length ? node.children : []);
                    for (const child of children) {
                        const found = findById(child, targetId);
                        if (found) return found;
                    }
                    return null;
                }

                let targetNode: any | null = null;
                for (const artboard of currentPage.artboards) {
                    targetNode = findById(artboard, id);
                    if (targetNode) break;
                }

                if (!targetNode) {
                    console.warn(`updateNodeFillById: node with id ${id} not found`);
                    return false;
                }

                // normalize hex: accept #RRGGBB or #RRGGBBAA
                const s = (hexColor || '').trim().replace(/^#/, '');
                
                // Validate hex format
                if (!/^[0-9A-Fa-f]+$/.test(s)) {
                    console.warn(`updateNodeFillById: hexColor ${hexColor} contains invalid characters`);
                    return false;
                }
                if (!(s.length === 6 || s.length === 8)) {
                    console.warn(`updateNodeFillById: hexColor ${hexColor} has unexpected length (expected 6 or 8 digits)`);
                    return false;
                }
                
                // Parse RGB values
                const r = parseInt(s.slice(0, 2), 16) / 255;
                const g = parseInt(s.slice(2, 4), 16) / 255;
                const b = parseInt(s.slice(4, 6), 16) / 255;
                
                // Handle alpha: assumes RGBA format (red-green-blue-alpha)
                // For ARGB (#AABBCCDD), the first two chars are alpha - not supported here
                const a = s.length === 8 ? parseInt(s.slice(6, 8), 16) / 255 : 1;

                const color = { red: r, green: g, blue: b, alpha: a };
                const fill = editor.makeColorFill(color);

                // apply fill
                try {
                    targetNode.fill = fill;
                } catch (e) {
                    // some node types may require different assignment
                    try {
                        if (Array.isArray(targetNode.fills)) {
                            targetNode.fills = [fill];
                        } else {
                            targetNode.fill = fill;
                        }
                    } catch (innerErr) {
                        console.error('Failed to set fill on node', innerErr);
                        return false;
                    }
                }

                return true;
            } catch (err) {
                console.error('updateNodeFillById error', err);
                return false;
            }
        }
        ,
        fixColor: async (nodeId: string, correctHex: string) => {
            try {
                const currentPage = editor.context.currentPage;

                function findById(node: any, targetId: string): any | null {
                    if (!node) return null;
                    if (node.id === targetId) return node;
                    const children = (node.allChildren && node.allChildren.length) ? node.allChildren : (node.children && node.children.length ? node.children : []);
                    for (const child of children) {
                        const found = findById(child, targetId);
                        if (found) return found;
                    }
                    return null;
                }

                let targetNode: any | null = null;
                for (const artboard of currentPage.artboards) {
                    targetNode = findById(artboard, nodeId);
                    if (targetNode) break;
                }

                if (!targetNode) {
                    console.warn(`fixColor: node with id ${nodeId} not found`);
                    return false;
                }

                // Parse hex to RGB color object
                const s = (correctHex || '').trim().replace(/^#/, '');
                
                // Validate hex format
                if (!/^[0-9A-Fa-f]+$/.test(s)) {
                    console.warn(`fixColor: correctHex ${correctHex} contains invalid characters`);
                    return false;
                }
                if (!(s.length === 6 || s.length === 8)) {
                    console.warn(`fixColor: correctHex ${correctHex} has unexpected length (expected 6 or 8 digits)`);
                    return false;
                }
                
                // Parse RGB values
                const r = parseInt(s.slice(0, 2), 16) / 255;
                const g = parseInt(s.slice(2, 4), 16) / 255;
                const b = parseInt(s.slice(4, 6), 16) / 255;
                
                // Handle alpha: assumes RGBA format (red-green-blue-alpha)
                // For ARGB (#AABBCCDD), the first two chars are alpha - not supported here
                const a = s.length === 8 ? parseInt(s.slice(6, 8), 16) / 255 : 1;

                const color = { red: r, green: g, blue: b, alpha: a };
                const fill = editor.makeColorFill(color);

                // Apply fill based on node type
                if (targetNode.type === "Text") {
                    // For text nodes, use applyCharacterStyles to set the color
                    const textLength = targetNode.text ? targetNode.text.length : 0;
                    targetNode.fullContent.applyCharacterStyles(
                        { color },
                        { start: 0, length: textLength }
                    );
                } else {
                    try {
                        targetNode.fill = fill;
                    } catch (e) {
                        if (Array.isArray(targetNode.fills)) {
                            targetNode.fills = [fill];
                        } else {
                            throw e;
                        }
                    }
                }

                return true;
            } catch (err) {
                console.error('fixColor error', err);
                return false;
            }
        },
        fixFont: async (nodeId: string, fontFamily: string) => {
            try {
                console.log(`fixFont called for nodeId=${nodeId}, fontFamily=${fontFamily}`);
                
                const currentPage = editor.context.currentPage;

                function findById(node: any, targetId: string): any | null {
                    if (!node) return null;
                    if (node.id === targetId) return node;
                    const children = (node.allChildren && node.allChildren.length) ? node.allChildren : (node.children && node.children.length ? node.children : []);
                    for (const child of children) {
                        const found = findById(child, targetId);
                        if (found) return found;
                    }
                    return null;
                }

                let targetNode: any | null = null;
                for (const artboard of currentPage.artboards) {
                    targetNode = findById(artboard, nodeId);
                    if (targetNode) break;
                }

                if (!targetNode) {
                    console.warn(`fixFont: node with id ${nodeId} not found`);
                    return false;
                }

                if (targetNode.type !== "Text") {
                    console.warn(`fixFont: node ${nodeId} is not a Text node, type=${targetNode.type}`);
                    return false;
                }

                // Map family names to PostScript names that Adobe Express SDK recognizes
                // The fonts API requires PostScript names, not family names
                // Each font can have multiple PostScript name variations to try
                const fontPostScriptMap: Record<string, string[]> = {
                    "arial": ["ArialMT", "Arial", "Arial-Regular"],
                    "courier": ["Courier", "CourierNewPSMT", "Courier-Regular", "CourierNew"],
                    "georgia": ["Georgia", "Georgia-Regular", "GeorgiaPSMT"]
                };

                // Normalize the requested font family
                const normalizedFamily = normalizeFontName(fontFamily);
                if (!normalizedFamily) {
                    console.error(`fixFont: invalid font family '${fontFamily}'`);
                    return false;
                }

                // Get the PostScript name variations for the font
                const postscriptNames = fontPostScriptMap[normalizedFamily];
                if (!postscriptNames || postscriptNames.length === 0) {
                    console.error(`fixFont: no PostScript mapping for font family '${fontFamily}' (normalized: '${normalizedFamily}')`);
                    console.error(`fixFont: available mappings:`, Object.keys(fontPostScriptMap));
                    return false;
                }

                console.log(`fixFont: trying to find font '${fontFamily}' (normalized: '${normalizedFamily}') with PostScript variations:`, postscriptNames);

                // Try each PostScript name variation until one works
                let availableFont: any = null;
                let successfulPostscriptName: string | null = null;
                
                for (const postscriptName of postscriptNames) {
                    try {
                        availableFont = await fonts.fromPostscriptName(postscriptName);
                        if (availableFont) {
                            successfulPostscriptName = postscriptName;
                            console.log(`fixFont: successfully found font using PostScript name '${postscriptName}'`);
                            console.log(`fixFont: font details - family: '${availableFont.family}', PostScript: '${availableFont.postscriptName}'`);
                            break;
                        }
                    } catch (lookupErr) {
                        // Try next variation
                        console.log(`fixFont: PostScript name '${postscriptName}' not found, trying next variation...`);
                        continue;
                    }
                }

                if (!availableFont) {
                    console.error(`fixFont: font '${fontFamily}' not available. Tried PostScript names:`, postscriptNames);
                    console.error(`fixFont: none of the PostScript name variations worked for '${fontFamily}'`);
                    return false;
                }

                const textLength = targetNode.text ? targetNode.text.length : 0;
                console.log(`fixFont: applying font '${availableFont.family}' (PostScript: '${availableFont.postscriptName}') to text node with length=${textLength}`);
                
                // Use editor.queueAsyncEdit to apply the font change
                try {
                    await editor.queueAsyncEdit(() => {
                        // Apply using the AvailableFont object returned by the SDK
                        targetNode.fullContent.applyCharacterStyles(
                            { font: availableFont } as any,
                            { start: 0, length: textLength }
                        );
                    });
                    
                    console.log(`fixFont: successfully applied font '${availableFont.family}' to node ${nodeId}`);
                    return true;
                } catch (err) {
                    console.error(`fixFont: SDK refused to apply font '${availableFont.family}' (PostScript: '${successfulPostscriptName}') on node ${nodeId}:`, err);
                    return false;
                }
            } catch (err) {
                console.error('fixFont error', err);
                return false;
            }
        },
        restoreColor: async (nodeId: string, hexColor: string) => {
            // restoreColor uses the same logic as fixColor - call fixColor directly
            try {
                const currentPage = editor.context.currentPage;

                function findById(node: any, targetId: string): any | null {
                    if (!node) return null;
                    if (node.id === targetId) return node;
                    const children = (node.allChildren && node.allChildren.length) ? node.allChildren : (node.children && node.children.length ? node.children : []);
                    for (const child of children) {
                        const found = findById(child, targetId);
                        if (found) return found;
                    }
                    return null;
                }

                let targetNode: any | null = null;
                for (const artboard of currentPage.artboards) {
                    targetNode = findById(artboard, nodeId);
                    if (targetNode) break;
                }

                if (!targetNode) {
                    console.warn(`restoreColor: node with id ${nodeId} not found`);
                    return false;
                }

                // Parse hex to RGB color object
                const s = (hexColor || '').trim().replace(/^#/, '');
                
                // Validate hex format
                if (!/^[0-9A-Fa-f]+$/.test(s)) {
                    console.warn(`restoreColor: hexColor ${hexColor} contains invalid characters`);
                    return false;
                }
                if (!(s.length === 6 || s.length === 8)) {
                    console.warn(`restoreColor: hexColor ${hexColor} has unexpected length (expected 6 or 8 digits)`);
                    return false;
                }
                
                // Parse RGB values
                const r = parseInt(s.slice(0, 2), 16) / 255;
                const g = parseInt(s.slice(2, 4), 16) / 255;
                const b = parseInt(s.slice(4, 6), 16) / 255;
                const a = s.length === 8 ? parseInt(s.slice(6, 8), 16) / 255 : 1;

                const color = { red: r, green: g, blue: b, alpha: a };
                const fill = editor.makeColorFill(color);

                // Apply fill based on node type
                if (targetNode.type === "Text") {
                    const textLength = targetNode.text ? targetNode.text.length : 0;
                    targetNode.fullContent.applyCharacterStyles(
                        { color },
                        { start: 0, length: textLength }
                    );
                } else {
                    try {
                        targetNode.fill = fill;
                    } catch (e) {
                        if (Array.isArray(targetNode.fills)) {
                            targetNode.fills = [fill];
                        } else {
                            throw e;
                        }
                    }
                }

                return true;
            } catch (err) {
                console.error('restoreColor error', err);
                return false;
            }
        },
        restoreFont: async (nodeId: string, fontName: string) => {
            // restoreFont uses the same logic as fixFont - call fixFont directly
            try {
                console.log(`restoreFont called for nodeId=${nodeId}, fontName=${fontName}`);
                
                const currentPage = editor.context.currentPage;

                function findById(node: any, targetId: string): any | null {
                    if (!node) return null;
                    if (node.id === targetId) return node;
                    const children = (node.allChildren && node.allChildren.length) ? node.allChildren : (node.children && node.children.length ? node.children : []);
                    for (const child of children) {
                        const found = findById(child, targetId);
                        if (found) return found;
                    }
                    return null;
                }

                let targetNode: any | null = null;
                for (const artboard of currentPage.artboards) {
                    targetNode = findById(artboard, nodeId);
                    if (targetNode) break;
                }

                if (!targetNode) {
                    console.warn(`restoreFont: node with id ${nodeId} not found`);
                    return false;
                }

                if (targetNode.type !== "Text") {
                    console.warn(`restoreFont: node ${nodeId} is not a Text node, type=${targetNode.type}`);
                    return false;
                }

                // Map family names to PostScript names that Adobe Express SDK recognizes
                const fontPostScriptMap: Record<string, string[]> = {
                    "arial": ["ArialMT", "Arial", "Arial-Regular"],
                    "courier": ["Courier", "CourierNewPSMT", "Courier-Regular", "CourierNew"],
                    "georgia": ["Georgia", "Georgia-Regular", "GeorgiaPSMT"]
                };

                // Normalize the requested font family
                const normalizedFamily = normalizeFontName(fontName);
                if (!normalizedFamily) {
                    console.error(`restoreFont: invalid font family '${fontName}'`);
                    return false;
                }

                // Get the PostScript name variations for the font
                const postscriptNames = fontPostScriptMap[normalizedFamily];
                if (!postscriptNames || postscriptNames.length === 0) {
                    console.error(`restoreFont: no PostScript mapping for font family '${fontName}' (normalized: '${normalizedFamily}')`);
                    return false;
                }

                // Try each PostScript name variation until one works
                let availableFont: any = null;
                let successfulPostscriptName: string | null = null;
                
                for (const postscriptName of postscriptNames) {
                    try {
                        availableFont = await fonts.fromPostscriptName(postscriptName);
                        if (availableFont) {
                            successfulPostscriptName = postscriptName;
                            break;
                        }
                    } catch (lookupErr) {
                        continue;
                    }
                }

                if (!availableFont) {
                    console.error(`restoreFont: font '${fontName}' not available. Tried PostScript names:`, postscriptNames);
                    return false;
                }

                const textLength = targetNode.text ? targetNode.text.length : 0;
                
                // Use editor.queueAsyncEdit to apply the font change
                try {
                    await editor.queueAsyncEdit(() => {
                        targetNode.fullContent.applyCharacterStyles(
                            { font: availableFont } as any,
                            { start: 0, length: textLength }
                        );
                    });
                    
                    return true;
                } catch (err) {
                    console.error(`restoreFont: SDK refused to apply font '${availableFont.family}' on node ${nodeId}:`, err);
                    return false;
                }
            } catch (err) {
                console.error('restoreFont error', err);
                return false;
            }
        },
    };

    // Expose `sandboxApi` to the UI runtime.
    runtime.exposeApi(sandboxApi);
}

start();
