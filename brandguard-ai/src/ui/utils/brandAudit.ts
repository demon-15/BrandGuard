export type BrandKit = {
    colors: string[]; // hex strings, normalized to lowercase without '#'
    fonts: string[]; // font family names, normalized to lowercase
};

export type DocumentElement = {
    id?: string;
    type?: string; // e.g., 'Text', 'Shape', 'Image'
    fill?: string | null; // color hex like '#FF0000' or 'rgb()' etc.
    stroke?: string | null;
    fontFamily?: string | null;
    // any other properties
    [key: string]: any;
};

export type Violation = {
    elementId?: string | null;
    elementType?: string | null;
    kind: "color" | "font";
    property: string; // e.g., 'fill', 'stroke', 'fontFamily'
    value: string;
    message: string;
};

function normalizeHex(hex: string): string | null {
    if (!hex) return null;
    const s = hex.trim().toLowerCase();
    // accept forms: #rrggbb, rrggbb
    const m = s.match(/^#?([0-9a-f]{6})$/i);
    if (m) return m[1];
    return null;
}

function normalizeFontName(name: string | null | undefined): string | null {
    if (!name) return null;
    return name.trim().toLowerCase();
}

export function scanForBrandViolations(elements: DocumentElement[], brandKit: BrandKit): Violation[] {
    const allowedColors = new Set(brandKit.colors.map(c => c.replace(/^#/, '').trim().toLowerCase()));
    const allowedFonts = new Set(brandKit.fonts.map(f => f.trim().toLowerCase()));

    const violations: Violation[] = [];

    for (const el of elements) {
        const id = el.id ?? null;
        const type = el.type ?? null;

        // check color properties
        const colorProps = ["fill", "stroke", "color", "backgroundColor"];
        for (const prop of colorProps) {
            const raw = el[prop];
            if (raw) {
                const hex = normalizeHex(String(raw));
                if (hex) {
                    if (!allowedColors.has(hex)) {
                        violations.push({
                            elementId: id,
                            elementType: type,
                            kind: "color",
                            property: prop,
                            value: `#${hex}`,
                            message: `Color ${"#" + hex} used in ${prop} is not in brand kit`
                        });
                    }
                }
            }
        }

        // check font
        if (el.fontFamily) {
            const name = normalizeFontName(el.fontFamily);
            if (name && !allowedFonts.has(name)) {
                violations.push({
                    elementId: id,
                    elementType: type,
                    kind: "font",
                    property: "fontFamily",
                    value: String(el.fontFamily),
                    message: `Font '${el.fontFamily}' is not in brand kit`
                });
            }
        }
    }

    return violations;
}
