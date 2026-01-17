import React from "react";
import { Button } from "@swc-react/button";
import { calculateContrastRatio, toHex6 } from "../utils/colors";

type Props = {
    currentColor: string;
    suggestedColor: string;
    onFix: () => void;
    label?: string;
    contrastRatio?: number;
    currentFont?: string | null;
    suggestedFont?: string;
    violationType?: "color" | "font" | "contrast";
    explanation?: string[];
    // Warning mode props - for unfixable contrast issues
    isWarning?: boolean;
    warningMessage?: string;
    isCurrentBest?: boolean; // True if current color is already the best brand option
};

const swatchStyle: React.CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: 6,
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
};

const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'nowrap'
};

const labelStyle: React.CSSProperties = {
    fontSize: '0.625rem',
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    whiteSpace: 'nowrap'
};

const swatchContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    minWidth: 0
};

const fontPreviewStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    padding: '8px 10px',
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    border: '1px solid #e5e7eb',
    fontFamily: 'inherit',
    color: '#1a1a2e',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
};

const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '5px 10px',
    borderRadius: 6,
    fontSize: '0.6875rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.03em'
};

const getStatusIcon = (violationType?: string) => {
    switch (violationType) {
        case 'font':
            return '📝';
        case 'contrast':
            return '👁️';
        case 'color':
        default:
            return '⚠️';
    }
};

export default function ViolationCard({ 
    currentColor, 
    suggestedColor, 
    onFix, 
    label, 
    contrastRatio,
    currentFont,
    suggestedFont,
    violationType = 'color',
    explanation,
    isWarning = false,
    warningMessage,
    isCurrentBest = false
}: Props) {
    const hex1 = toHex6(currentColor);
    const hex2 = toHex6(suggestedColor);
    const actualContrast = contrastRatio || (hex1 && hex2 ? calculateContrastRatio(hex1, hex2).ratio : 0);

    const getContrastBadge = () => {
        if (!actualContrast || Number.isNaN(actualContrast)) return null;

        const isPass = actualContrast >= 4.5;
        const isBorderline = !isPass && actualContrast >= 3;

        const badgeConfig = isPass
            ? { bg: '#c8e6c9', fg: '#2e7d32', label: 'Pass', icon: '🟢' }
            : isBorderline
                ? { bg: '#fff9c4', fg: '#f57f17', label: 'Borderline', icon: '🟡' }
                : { bg: '#ffcdd2', fg: '#c62828', label: 'Fail', icon: '🔴' };

        return (
            <div className="contrast-badge-container">
                <span
                    style={{
                        ...badgeStyle,
                        backgroundColor: badgeConfig.bg,
                        color: badgeConfig.fg
                    }}
                >
                    {badgeConfig.icon} {actualContrast.toFixed(1)}:1 {badgeConfig.label}
                </span>
            </div>
        );
    };

    // Warning card for unfixable contrast issues
    if (isWarning) {
        return (
            <div className="violation-card-enhanced violation-card-warning">
                <div className="violation-card-content">
                    <div className="violation-card-header">
                        <div className="violation-card-icon-wrapper">
                            <div className="violation-card-icon">⚠️</div>
                        </div>
                        <div className="violation-card-label">
                            {label}
                        </div>
                    </div>

                    <div className="violation-card-body">
                        {isCurrentBest ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={swatchContainerStyle}>
                                    <div style={labelStyle}>Current</div>
                                    <div style={{ ...swatchStyle, background: currentColor, border: '2px solid #10b981' }} />
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 500 }}>
                                    ✓ Best option
                                </div>
                            </div>
                        ) : (
                            <div style={rowStyle}>
                                <div style={swatchContainerStyle}>
                                    <div style={labelStyle}>Current</div>
                                    <div style={{ ...swatchStyle, background: currentColor }} />
                                </div>
                                <div style={{ fontSize: '1rem', color: '#94a3b8', flexShrink: 0 }}>→</div>
                                <div style={swatchContainerStyle}>
                                    <div style={labelStyle}>Best</div>
                                    <div style={{ ...swatchStyle, background: suggestedColor, border: '2px dashed #f59e0b' }} />
                                </div>
                            </div>
                        )}

                        {actualContrast > 0 && getContrastBadge()}
                        
                        {warningMessage && (
                            <div className="warning-message-box">
                                <span className="warning-icon-small">💡</span>
                                <span>{warningMessage}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="violation-card-action">
                    <div className="warning-badge">
                        <span>{isCurrentBest ? 'Background Issue' : 'No Fix Available'}</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="violation-card-enhanced">
            <div className="violation-card-content">
                <div className="violation-card-header">
                    <div className="violation-card-icon-wrapper">
                        <div className="violation-card-icon">{getStatusIcon(violationType)}</div>
                        {explanation && explanation.length > 0 && (
                            <div className="violation-tooltip">
                                <div className="violation-tooltip-content">
                                    <ul>
                                        {explanation.map((item, index) => (
                                            <li key={index}>{item}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="violation-card-label">
                        {label}
                    </div>
                </div>

                {violationType === 'font' && currentFont && suggestedFont ? (
                    <div className="violation-card-body">
                        <div className="font-comparison">
                            <div className="font-preview-section">
                                <div className="preview-label">Current Font</div>
                                <div style={{ ...fontPreviewStyle, fontFamily: currentFont }}>
                                    {currentFont}
                                </div>
                            </div>
                            <div className="font-arrow">→</div>
                            <div className="font-preview-section">
                                <div className="preview-label">Brand Font</div>
                                <div style={{ ...fontPreviewStyle, fontFamily: suggestedFont, backgroundColor: '#e8f5e9', borderColor: '#4caf50' }}>
                                    {suggestedFont}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="violation-card-body">
                        <div style={rowStyle}>
                            <div style={swatchContainerStyle}>
                                <div style={labelStyle}>Current</div>
                                <div style={{ ...swatchStyle, background: currentColor }} />
                            </div>
                            <div style={{ fontSize: '1rem', color: '#94a3b8', flexShrink: 0 }}>→</div>
                            <div style={swatchContainerStyle}>
                                <div style={labelStyle}>Brand</div>
                                <div style={{ ...swatchStyle, background: suggestedColor }} />
                            </div>
                        </div>

                        {actualContrast > 0 && getContrastBadge()}
                    </div>
                )}
            </div>

            <div className="violation-card-action">
                <Button variant="cta" onClick={onFix}>Fix</Button>
            </div>
        </div>
    );
}
