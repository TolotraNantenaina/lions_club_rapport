const UNSUPPORTED_COLOR_PATTERN = /oklch\([^)]*\)|oklab\([^)]*\)|\blch\([^)]*\)|\blab\([^)]*\)/gi;

const COLOR_PROPERTIES = [
    'color',
    'background',
    'background-color',
    'background-image',
    'border-color',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
    'outline-color',
    'text-decoration-color',
    'fill',
    'stroke',
    'box-shadow',
];

let colorCanvasContext;

function getColorCanvasContext() {
    if (!colorCanvasContext) {
        const canvas = document.createElement('canvas');
        colorCanvasContext = canvas.getContext('2d');
    }

    return colorCanvasContext;
}

function containsUnsupportedColor(value) {
    return /oklch\(|oklab\(|\blch\(|\blab\(/i.test(value);
}

export function toHtml2CanvasSafeColor(value) {
    if (!value || value === 'none' || value === 'transparent' || value === 'inherit' || value === 'initial') {
        return value;
    }

    if (!containsUnsupportedColor(value)) {
        return value;
    }

    return value.replace(UNSUPPORTED_COLOR_PATTERN, (match) => {
        try {
            const context = getColorCanvasContext();
            context.fillStyle = '#000000';
            context.fillStyle = match;
            return context.fillStyle;
        } catch {
            return '#000000';
        }
    });
}

function sanitizeStyleTags(clonedDocument) {
    clonedDocument.querySelectorAll('style').forEach((styleElement) => {
        const cssText = styleElement.textContent;

        if (!cssText || !containsUnsupportedColor(cssText)) {
            return;
        }

        styleElement.textContent = toHtml2CanvasSafeColor(cssText);
    });
}

function patchUnsupportedColors(sourceElement, targetElement) {
    const computed = window.getComputedStyle(sourceElement);

    COLOR_PROPERTIES.forEach((property) => {
        const value = computed.getPropertyValue(property);

        if (!containsUnsupportedColor(value)) {
            return;
        }

        targetElement.style.setProperty(
            property,
            toHtml2CanvasSafeColor(value),
            computed.getPropertyPriority(property),
        );
    });
}

export function prepareHtml2CanvasClone(sourceRoot, clonedDocument, clonedRoot) {
    sanitizeStyleTags(clonedDocument);

    const sourceNodes = [sourceRoot, ...sourceRoot.querySelectorAll('*')];
    const targetNodes = [clonedRoot, ...clonedRoot.querySelectorAll('*')];

    sourceNodes.forEach((sourceElement, index) => {
        const targetElement = targetNodes[index];

        if (!targetElement) {
            return;
        }

        patchUnsupportedColors(sourceElement, targetElement);
    });

    clonedDocument.querySelectorAll('input, select, textarea').forEach((input) => {
        input.style.boxSizing = 'border-box';
        input.style.appearance = 'none';
        input.style.webkitAppearance = 'none';
    });
}
