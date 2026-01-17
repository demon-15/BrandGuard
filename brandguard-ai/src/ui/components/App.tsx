import "@spectrum-web-components/theme/express/scale-medium.js";
import "@spectrum-web-components/theme/express/theme-light.js";

import { Button } from "@swc-react/button";
import { Theme } from "@swc-react/theme";
import React, { useState, useCallback, useMemo } from "react";
import { DocumentSandboxApi, ScannedElement } from "../../models/DocumentSandboxApi";
import { BRAND_KIT, findNearestBrandColor, isFontAllowed } from "../../brandConfig";
import { useBrandKit, hasUploadedBrandKit, clearUploadedBrandKit } from "../../hooks/useBrandKit";
import { toHex6, calculateContrastRatio, colorDistance, getRelativeLuminance } from "../utils/colors";
import { handleBrandKitUpload } from "../utils/brandKitUpload";
import { analyzeBrandAlignment } from "../utils/brandAlignment";
import ViolationCard from "./ViolationCard";
import BrandShield from "./BrandShield";
import BrandKitCreator from "./BrandKitCreator";
import BrandKitSelector from "./BrandKitSelector";
import "./App.css";

import { AddOnSDKAPI } from "https://new.express.adobe.com/static/add-on-sdk/sdk.js";

// Microphone animation component for tone analysis
const MicrophoneAnimation = () => (
  <svg width="20" height="20" viewBox="0 0 28 24" className="mic-analyzing">
    {/* Microphone body */}
    <path 
      d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" 
      fill="currentColor"
    />
    {/* Microphone stand */}
    <path 
      d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" 
      fill="currentColor"
    />
    {/* Animated sound bars */}
    <rect x="20" y="7" width="2.5" height="10" rx="1.25" className="sound-bar bar-1" />
    <rect x="24" y="4" width="2.5" height="16" rx="1.25" className="sound-bar bar-2" />
  </svg>
);

// Shield scanning animation component for brand audit
const ShieldScanAnimation = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" className="shield-scanning">
    {/* Shield outline */}
    <path 
      d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z" 
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="shield-outline"
    />
    {/* Scanning line */}
    <line 
      x1="6" y1="8" x2="18" y2="8" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round"
      className="scan-line"
    />
    {/* Check mark (appears after scan) */}
    <path 
      d="M9 12l2 2 4-4" 
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="check-mark"
    />
  </svg>
);

// Add TypeScript type for the score prop
interface ToneGaugeProps {
  score: number;
}

const ToneGauge = ({ score }: ToneGaugeProps) => {
  // Map 0-100 score to rotation (0 to 180 degrees)
  const rotation = (score / 100) * 180;
  const color = score > 70 ? "#2D9D78" : score > 40 ? "#F29339" : "#D7373F";

  return (
    <div className="gauge-container">
      <div className="gauge-body">
        <div 
          className="gauge-fill" 
          style={{ transform: `rotate(${rotation}deg)`, backgroundColor: color }}
        ></div>
        <div className="gauge-cover">
            <span className="gauge-text">{score}%</span>
        </div>
      </div>
      <p className="gauge-label">Brand Harmony Score</p>
    </div>
  );
};

interface IntelligenceAnalysisProps {
  aiResult: { score: number; suggestion: string } | null;
  isLoading: boolean;
}

const IntelligenceAnalysis = ({ aiResult, isLoading }: IntelligenceAnalysisProps) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  
  if (isLoading) {
    return (
      <div className="intelligence-card-compact" style={{ borderLeft: `3px solid #667eea` }}>
        <div className="ai-card-row">
          <span className="ai-badge">✨ AI</span>
          <span className="ai-loading-text">Analyzing tone...</span>
        </div>
      </div>
    );
  }
  
  if (!aiResult) return null;

  const { score, suggestion } = aiResult;
  const statusColor = score > 70 ? "#2D9D78" : score > 40 ? "#F29339" : "#D7373F";

  return (
    <div className="intelligence-card-compact" style={{ borderLeft: `3px solid ${statusColor}` }}>
      <div 
        className="ai-card-row ai-card-clickable" 
        onClick={() => setIsExpanded(!isExpanded)}
        title="Click to expand/collapse"
      >
        <div className="ai-left">
          <span className="ai-badge">✨ Tone</span>
          <span className="ai-score" style={{ color: statusColor }}>{score}%</span>
        </div>
        <span className="ai-expand-icon">{isExpanded ? '▲' : '▼'}</span>
      </div>
      
      {isExpanded && (
        <div className="ai-expanded-content">
          <div className="ai-gauge-mini">
            <div className="ai-gauge-fill" style={{ width: `${score}%`, backgroundColor: statusColor }} />
          </div>
          <div className="ai-suggestion">
            {suggestion || 'No suggestion available'}
          </div>
          <p className="ai-disclaimer">AI-generated. Please verify before use.</p>
        </div>
      )}
    </div>
  );
};

// Type for unfixable contrast warnings
interface UnfixableContrastWarning {
    element: ScannedElement;
    currentRatio: number;
    bestPossibleRatio: number;
    bestBrandColor: string;
    requiredRatio: number;
    wcagLevel: string;
    isCurrentBest: boolean; // True if the current color is already the best brand color
}

const App = ({ addOnUISdk, sandboxProxy }: { addOnUISdk: AddOnSDKAPI; sandboxProxy: DocumentSandboxApi }) => {
    const brandKit = useBrandKit(); // Get dynamic brand kit
    const [elements, setElements] = useState<ScannedElement[]>([]);
    const [violations, setViolations] = useState<ScannedElement[]>([]);
    const [healthScore, setHealthScore] = useState<number>(100);
    const [brandVoiceResults, setBrandVoiceResults] = useState<{ score: number; suggestion: string } | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isAuditing, setIsAuditing] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const [activeTab, setActiveTab] = useState<'audit' | 'tone'>('audit'); // Tab navigation state
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    
    // Snapshot state for undo functionality
    const [fixAllSnapshot, setFixAllSnapshot] = useState<Map<string, { color: string | null; font: string | null }> | null>(null);
    
    // Brand Kit Creator modal state
    const [isCreatorOpen, setIsCreatorOpen] = useState(false);
    
    // Unfixable contrast warnings - elements where no brand color can achieve WCAG compliance
    const [unfixableWarnings, setUnfixableWarnings] = useState<UnfixableContrastWarning[]>([]);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUploadError(null);
        setUploadSuccess(false);

        try {
            const result = await handleBrandKitUpload(file);
            if (result.valid) {
                setUploadSuccess(true);
                // Clear success message after 3 seconds
                setTimeout(() => setUploadSuccess(false), 3000);
                // The listener system will automatically update the brandKit via useBrandKit hook
            } else {
                // Format errors for better display
                const errorMessages = result.errors.map(e => {
                    // Format field names to be more readable
                    const fieldName = e.field
                        .replace(/\[(\d+)\]/g, ' at position $1')
                        .replace(/allowedColors/g, 'Color')
                        .replace(/allowedFonts/g, 'Font')
                        .replace(/minContrast/g, 'Minimum Contrast');
                    return `${fieldName}: ${e.message}`;
                });
                setUploadError(errorMessages.join('\n'));
            }
        } catch (error) {
            setUploadError(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsUploading(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleClearUploadedKit = async () => {
        await clearUploadedBrandKit();
        setUploadSuccess(false);
        setUploadError(null);
        // The listener system will automatically update the brandKit via useBrandKit hook
    };

    const handleGetStarted = () => {
        setHasStarted(true);
        handleAudit(true); // Trigger the first "Run Brand Audit" with animation
        setActiveTab('audit');
    };

    const handleAuditTabClick = () => {
        setActiveTab('audit');
        handleAudit(true); // Show animation when clicking tab
    };

    const handleToneTabClick = () => {
        setActiveTab('tone');
        handleBrandVoiceAudit();
    };

    const handleAudit = useCallback(async (showAnimation: boolean = false) => {
        // Only show animation when explicitly requested (tab click)
        if (showAnimation) {
            setIsAuditing(true);
        }
        
        try {
        // Only add delay when showing animation
        const scanPromise = sandboxProxy.scanDocument();
        
        let scanResult;
        if (showAnimation) {
            // Minimum animation duration (3.5 seconds) for better UX
            const minAnimationTime = new Promise(resolve => setTimeout(resolve, 3500));
            const [result] = await Promise.all([scanPromise, minAnimationTime]);
            scanResult = result;
        } else {
            // No delay for fix operations
            scanResult = await scanPromise;
        }
        
        const { results, violations } = scanResult;
        setElements(results);

        // Log violations for debugging
        console.log("Font Violations:", violations);

        // Filter to find elements that fail EITHER Brand check OR Contrast check OR Font check
        const badElements = results.filter((el: ScannedElement) => {
            let hasSomeViolation = false;

            // 1. Check Brand Color Compliance (only if element has a fillColor)
            if (el.fillColor) {
                const hexColor = toHex6(el.fillColor);
                if (hexColor) {
                    const currentHex = hexColor.slice(0, 7); // Normalize by removing alpha channel
                    const isBrandCompliant = brandKit.allowedColors.some(
                        brandHex => brandHex.toUpperCase() === currentHex.toUpperCase()
                    );
                    if (!isBrandCompliant) {
                        hasSomeViolation = true;
                    }

                    // 2. Check Contrast Compliance (WCAG standard from brand kit)
                    // Only check contrast if we successfully found a background color
                    if (el.containerFillColor) {
                        const bgHex = toHex6(el.containerFillColor);
                        if (bgHex) {
                            const isTextElement = el.type === 'Text';
                            const minContrast = brandKit.accessibility.minContrast;
                            // Determine if using AAA (>= 7.0) or AA (< 7.0) standard
                            const isAAA = minContrast >= 7.0;
                            const contrastResult = calculateContrastRatio(currentHex, bgHex, {
                                largeText: isTextElement,
                                reportAAA: isAAA
                            });
                            // Use AAA if brand kit requires 7.0+, otherwise use AA
                            const isContrastCompliant = isAAA ? !!contrastResult.passesAAA : !!contrastResult.passesAA;
                            if (!isContrastCompliant) {
                                // Check if current color is already a brand color with the best possible contrast
                                // If so, don't flag as a violation - user already has the best brand-compliant option
                                if (isBrandCompliant) {
                                    // Find the best contrast ratio among all other brand colors
                                    const requiredContrast = isTextElement 
                                        ? (isAAA ? 4.5 : 3.0)  // Large text thresholds
                                        : minContrast;
                                    
                                    const currentRatio = contrastResult.ratio;
                                    
                                    // Check if any other brand color has better contrast
                                    const hasBetterBrandColor = brandKit.allowedColors.some(brandHex => {
                                        const normalizedBrand = toHex6(brandHex);
                                        if (!normalizedBrand || normalizedBrand.toUpperCase() === currentHex.toUpperCase()) {
                                            return false; // Skip current color
                                        }
                                        const { ratio: otherRatio } = calculateContrastRatio(normalizedBrand, bgHex, {
                                            largeText: isTextElement
                                        });
                                        // Only consider it "better" if it actually meets the required contrast
                                        // OR if it has meaningfully better contrast (not just marginally better)
                                        return otherRatio >= requiredContrast || otherRatio > currentRatio + 0.5;
                                    });
                                    
                                    // Only flag as violation if there's a better brand color available
                                    if (hasBetterBrandColor) {
                                        hasSomeViolation = true;
                                    }
                                    // Otherwise, skip - user already has the best brand-compliant option
                                } else {
                                    // Current color is not a brand color, so it's still a violation
                                    hasSomeViolation = true;
                                }
                            }
                        }
                    }
                }
            }

            // 3. Check Font Compliance (check regardless of fillColor)
            if (el.fontName && !isFontAllowed(el.fontName)) {
                hasSomeViolation = true;
            }

            return hasSomeViolation;
        });

        // Identify unfixable contrast warnings - elements where no brand color achieves WCAG compliance
        const unfixableContrastWarnings: UnfixableContrastWarning[] = [];
        
        for (const el of results) {
            if (!el.fillColor || !el.containerFillColor) continue;
            
            const hexColor = toHex6(el.fillColor);
            const bgHex = toHex6(el.containerFillColor);
            if (!hexColor || !bgHex) continue;
            
            const currentHex = hexColor.slice(0, 7);
            const isTextElement = el.type === 'Text';
            const minContrast = brandKit.accessibility.minContrast;
            const isAAA = minContrast >= 7.0;
            const wcagLevel = isAAA ? 'AAA' : 'AA';
            const requiredRatio = isTextElement 
                ? (isAAA ? 4.5 : 3.0)  // Large text thresholds
                : minContrast;
            
            // Check if current color is a brand color
            const isBrandCompliant = brandKit.allowedColors.some(
                brandHex => brandHex.toUpperCase() === currentHex.toUpperCase()
            );
            
            // Check current contrast
            const currentContrastResult = calculateContrastRatio(currentHex, bgHex, {
                largeText: isTextElement,
                reportAAA: isAAA
            });
            const isContrastCompliant = isAAA ? !!currentContrastResult.passesAAA : !!currentContrastResult.passesAA;
            
            // Only check for unfixable if current color is brand-compliant but contrast fails
            if (isBrandCompliant && !isContrastCompliant) {
                // Find the best possible contrast among ALL brand colors
                let bestRatio = 0;
                let bestColor = brandKit.allowedColors[0];
                
                for (const brandHex of brandKit.allowedColors) {
                    const normalizedBrand = toHex6(brandHex);
                    if (!normalizedBrand) continue;
                    
                    const { ratio } = calculateContrastRatio(normalizedBrand, bgHex, {
                        largeText: isTextElement
                    });
                    
                    if (ratio > bestRatio) {
                        bestRatio = ratio;
                        bestColor = brandHex;
                    }
                }
                
                // If no brand color can achieve the required contrast, it's unfixable
                if (bestRatio < requiredRatio) {
                    // Check if current color is already the best option
                    const bestColorNormalized = toHex6(bestColor);
                    const isCurrentBest = bestColorNormalized?.toUpperCase() === currentHex.toUpperCase();
                    
                    unfixableContrastWarnings.push({
                        element: el,
                        currentRatio: currentContrastResult.ratio,
                        bestPossibleRatio: bestRatio,
                        bestBrandColor: bestColor,
                        requiredRatio,
                        wcagLevel,
                        isCurrentBest
                    });
                }
            }
        }
        
        setUnfixableWarnings(unfixableContrastWarnings);

        // Calculate Score based on total scanned elements
        const totalScannable = results.length;
        const score = totalScannable > 0 
            ? Math.round(((totalScannable - badElements.length) / totalScannable) * 100) 
            : 100;

        setViolations(badElements);
        setHealthScore(score);
        } finally {
            setIsAuditing(false);
        }
    }, [sandboxProxy, brandKit]);

    const determineSuggestedColor = useCallback((el: ScannedElement): string => {
        const currentHex = toHex6(el.fillColor);
        if (!currentHex) return brandKit.allowedColors[0];

        const isTextElement = el.type === 'Text';

        // Check contrast compliance using brand kit's WCAG standard
        let isContrastCompliant = true;
        if (el.containerFillColor) {
            const bgHex = toHex6(el.containerFillColor);
            if (bgHex) {
                const minContrast = brandKit.accessibility.minContrast;
                const isAAA = minContrast >= 7.0;
                const contrastResult = calculateContrastRatio(currentHex, bgHex, {
                    largeText: isTextElement,
                    reportAAA: isAAA
                });
                isContrastCompliant = isAAA ? !!contrastResult.passesAAA : !!contrastResult.passesAA;
            }
        }

        // If contrast violation and background is known, build a Safe List using brand kit's minContrast and pick the closest visually.
        if (!isContrastCompliant && el.containerFillColor) {
            const bgHex = toHex6(el.containerFillColor);
            if (bgHex) {
                // 1) Calculate background luminance (for debugging or future use)
                const bgLuminance = getRelativeLuminance(bgHex);

                // 2) Safe List: colors with contrast >= brand kit's minContrast against the background
                // For large text, use 3.0 for AA or 4.5 for AAA; for normal text, use minContrast directly
                const minContrast = brandKit.accessibility.minContrast;
                const requiredContrast = isTextElement 
                    ? (minContrast >= 7.0 ? 4.5 : 3.0)  // Large text: AAA=4.5, AA=3.0
                    : minContrast;  // Normal text: use minContrast directly
                
                // IMPORTANT: Exclude the current color to ensure we suggest a different color
                const safeList = brandKit.allowedColors.filter(color => {
                    const normalizedColor = toHex6(color);
                    if (!normalizedColor) return false;
                    
                    // Exclude the current color (normalize both for comparison)
                    if (normalizedColor.toUpperCase() === currentHex.toUpperCase()) {
                        return false;
                    }
                    const { ratio } = calculateContrastRatio(normalizedColor, bgHex, {
                        largeText: isTextElement
                    });
                    return ratio >= requiredContrast;
                });

                if (safeList.length > 0) {
                    // 3) From Safe List, pick visually closest to the original off-brand color
                    return safeList.reduce((best, color) => {
                        const bestDist = colorDistance(best, currentHex);
                        const currDist = colorDistance(color, currentHex);
                        return currDist < bestDist ? color : best;
                    });
                }

                // Fallback: If none pass 3.0, suggest the highest contrast option
                // Still exclude the current color
                const fallbackList = brandKit.allowedColors.filter(color => {
                    const normalizedColor = toHex6(color);
                    return normalizedColor && normalizedColor.toUpperCase() !== currentHex.toUpperCase();
                });
                
                if (fallbackList.length > 0) {
                    return fallbackList.reduce((best, color) => {
                        const bestNormalized = toHex6(best);
                        const colorNormalized = toHex6(color);
                        if (!bestNormalized || !colorNormalized) return best;
                        
                        const { ratio: bestRatio } = calculateContrastRatio(bestNormalized, bgHex, {
                            largeText: isTextElement
                        });
                        const { ratio: currRatio } = calculateContrastRatio(colorNormalized, bgHex, {
                            largeText: isTextElement
                        });
                        return currRatio > bestRatio ? color : best;
                    });
                }
                
                // Last resort: if all brand colors are the same as current, return first different one
                // This should rarely happen, but ensures we always return a different color
                const differentColor = brandKit.allowedColors.find(color => {
                    const normalizedColor = toHex6(color);
                    return normalizedColor && normalizedColor.toUpperCase() !== currentHex.toUpperCase();
                });
                return differentColor || brandKit.allowedColors[0];
            }
        }

        // For brand violations or when contrast not checked, use nearest brand color
        return findNearestBrandColor(currentHex) || brandKit.allowedColors[0];
    }, [brandKit]);

    const handleFix = useCallback(async (el: ScannedElement) => {
        if (!el || !el.id) return;
        const suggestedColor = determineSuggestedColor(el);
        const needsFontFix = el.fontName && !isFontAllowed(el.fontName);
        const suggestedFont = needsFontFix ? brandKit.allowedFonts[0] : null;
        try {
            if (suggestedColor) {
                await sandboxProxy.fixColor(el.id, suggestedColor);
            }
            if (needsFontFix && suggestedFont) {
                const ok = await sandboxProxy.fixFont(el.id, suggestedFont);
                if (!ok) {
                    throw new Error(`Font '${suggestedFont}' could not be applied (SDK rejected or unavailable).`);
                }
            }
            await handleAudit();
        } catch (err) {
            console.error('fix failed', err);
        }
    }, [sandboxProxy, handleAudit, determineSuggestedColor, isFontAllowed, brandKit]);

    const handleFixAll = useCallback(async () => {
        try {
            // Scan document fresh to get current state (not stale violations array)
            const { results: currentResults } = await sandboxProxy.scanDocument();
            
            // Create a map of current results by ID for quick lookup
            const currentStateMap = new Map<string, ScannedElement>();
            for (const el of currentResults) {
                currentStateMap.set(el.id, el);
            }
            
            // Only capture snapshot and apply fixes if there are violations to fix
            if (violations.length > 0) {
                // Capture snapshot of current state before fixing
                // Use fresh scan results for elements that are in violations
                const snapshot = new Map<string, { color: string | null; font: string | null }>();
                for (const violationEl of violations) {
                    // Get the current state from the fresh scan
                    const currentEl = currentStateMap.get(violationEl.id);
                    if (currentEl) {
                        snapshot.set(violationEl.id, {
                            color: currentEl.fillColor,
                            font: currentEl.fontName
                        });
                    } else {
                        // Fallback to violation data if not found in fresh scan
                        snapshot.set(violationEl.id, {
                            color: violationEl.fillColor,
                            font: violationEl.fontName
                        });
                    }
                }
                
                // Update snapshot with current state before applying fixes
                setFixAllSnapshot(snapshot);
                
                // Apply fixes
                for (const el of violations) {
                    await handleFix(el);
                }
            }
            // If there are no violations, don't update the snapshot
            // This preserves the previous snapshot so "Undo All" can still restore
            // to the state before the most recent "Fix All" that actually made changes
        } catch (err) {
            console.error('fixAll failed', err);
        }
    }, [violations, handleFix, sandboxProxy]);
    
    const handleUndoAll = useCallback(async () => {
        if (!fixAllSnapshot) {
            console.warn('No snapshot available to undo');
            return;
        }
        
        try {
            // Restore each element to its previous state
            for (const [nodeId, state] of fixAllSnapshot.entries()) {
                if (state.color) {
                    await sandboxProxy.restoreColor(nodeId, state.color);
                }
                if (state.font) {
                    await sandboxProxy.restoreFont(nodeId, state.font);
                }
            }
            
            // Clear snapshot after restore
            setFixAllSnapshot(null);
            
            // Refresh audit to reflect restored state
            await handleAudit();
        } catch (err) {
            console.error('undoAll failed', err);
        }
    }, [fixAllSnapshot, sandboxProxy, handleAudit]);
    const handleBrandVoiceAudit = useCallback(async () => {
        setIsAnalyzing(true); // Start loading
        try {
            // Get all text layers from the document
            const { results, violations } = await sandboxProxy.scanDocument();
            const textLayers = results.filter((el: ScannedElement) => 
                el.type === 'Text' && el.textContent && el.textContent.trim().length > 0
            );

            // Log violations for debugging
            console.log("Font Violations:", violations);

            if (textLayers.length === 0) {
                console.warn('No text layers found');
                setBrandVoiceResults({ score: 100, suggestion: 'No text content to analyze' });
                return;
            }

            // Combine all text content
            const allText = textLayers
                .map((el: ScannedElement) => el.textContent)
                .join(' ');

            // Analyze brand alignment directly (no backend needed)
            const result = await analyzeBrandAlignment(allText);

            // Ensure score defaults to 0 if missing and scale to 0-100 if necessary
            let score = typeof result.score === 'number' ? result.score : 0;
            if (score > 0 && score <= 1) {
                score *= 100;
            }

            if (result.success) {
                setBrandVoiceResults({
                    score: Math.round(score),
                    suggestion: result.suggestion
                });
            } else {
                console.error('Analysis error:', result);
                setBrandVoiceResults({ score: 0, suggestion: 'Error analyzing text' });
            }
        } catch (error) {
            console.error('Brand voice audit failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            setBrandVoiceResults({ 
                score: 0, 
                suggestion: `Failed to analyze brand voice: ${errorMessage}. Please check your Gemini API configuration.` 
            });
        } finally {
            setIsAnalyzing(false); // Stop loading
        }
    }, [sandboxProxy]);

    const violationCards = useMemo(() => {
        return violations.map((el: ScannedElement) => {
            const hex = toHex6(el.fillColor);
            
            // Determine violation reasons (can be multiple)
            const reasons: string[] = [];
            let primaryViolationType: "color" | "font" | "contrast" = "color";
            let hasContrastViolation = false;
            let hasColorViolation = false;
            let hasFontViolation = false;
            
            // Check Brand Color Compliance
            const isBrandCompliant = hex && brandKit.allowedColors.some(
                brandHex => brandHex.toUpperCase() === hex.toUpperCase()
            );
            if (!isBrandCompliant) {
                reasons.push('Brand Violation');
                hasColorViolation = true;
            }
            
            // Check Contrast Compliance
            let contrastRatio = 0;
            if (el.containerFillColor && hex) {
                const bgHex = toHex6(el.containerFillColor);
                if (bgHex) {
                    const isTextElement = el.type === 'Text';
                    const minContrast = brandKit.accessibility.minContrast;
                    const isAAA = minContrast >= 7.0;
                    const contrastResult = calculateContrastRatio(hex, bgHex, {
                        largeText: isTextElement,
                        reportAAA: isAAA
                    });
                    contrastRatio = contrastResult.ratio;
                    // Check against the appropriate standard (AAA if minContrast >= 7.0, otherwise AA)
                    const isCompliant = isAAA ? !!contrastResult.passesAAA : !!contrastResult.passesAA;
                    if (!isCompliant) {
                        reasons.push('Low Contrast');
                        hasContrastViolation = true;
                    }
                }
            }
            
            // Check Font Compliance
            if (el.fontName && !isFontAllowed(el.fontName)) {
                reasons.push('Font Violation');
                hasFontViolation = true;
            }
            
            // Prioritize: Contrast (accessibility) > Font > Color
            if (hasContrastViolation) {
                primaryViolationType = "contrast";
            } else if (hasFontViolation) {
                primaryViolationType = "font";
            } else if (hasColorViolation) {
                primaryViolationType = "color";
            }
            
            const violationReason = reasons.length > 0 ? `(${reasons.join(' & ')})` : '(Violation)';
            const suggestedColor = determineSuggestedColor(el);
            const suggestedFont = el.fontName && !isFontAllowed(el.fontName) ? brandKit.allowedFonts[0] : undefined;
            
            // Generate explanation text based on violation type
            const generateExplanation = (): string[] => {
                const explanations: string[] = [];
                
                if (hasColorViolation && hex) {
                    explanations.push(
                        `This ${el.type.toLowerCase()} uses ${hex}, which is not in your brand palette. Changing to ${suggestedColor} ensures brand consistency.`
                    );
                }
                
                if (hasContrastViolation && contrastRatio > 0) {
                    const minContrast = brandKit.accessibility.minContrast;
                    const isAAA = minContrast >= 7.0;
                    const wcagLevel = isAAA ? 'AAA' : 'AA';
                    const requiredRatio = isAAA ? '7:1' : '4.5:1';
                    explanations.push(
                        `The contrast ratio of ${contrastRatio.toFixed(1)}:1 fails WCAG ${wcagLevel} standards (requires ${requiredRatio}). Low contrast makes text difficult to read for users with visual impairments.`
                    );
                }
                
                if (hasFontViolation && el.fontName && suggestedFont) {
                    explanations.push(
                        `The font "${el.fontName}" is not approved for brand use. "${suggestedFont}" is the designated brand font.`
                    );
                }
                
                return explanations;
            };
            
            return (
                <ViolationCard 
                    key={el.id}
                    currentColor={el.fillColor || 'transparent'}
                    suggestedColor={suggestedColor}
                    label={`${el.type} ${violationReason}${el.textContent ? ` — "${el.textContent}"` : ''}`}
                    onFix={() => handleFix(el)}
                    contrastRatio={contrastRatio}
                    currentFont={el.fontName}
                    suggestedFont={suggestedFont}
                    violationType={primaryViolationType}
                    explanation={generateExplanation()}
                />
            );
        });
    }, [violations, handleFix, determineSuggestedColor, brandKit]);

    return (
        // Please note that the below "<Theme>" component does not react to theme changes in Express.
        // You may use "addOnUISdk.app.ui.theme" to get the current theme and react accordingly.
        <Theme system="express" scale="medium" color="light">
            <div className="container">
                {/* Brand Kit Section */}
                <div style={{ 
                    padding: '20px', 
                    backgroundColor: '#ffffff', 
                    borderRadius: '14px', 
                    marginBottom: '24px',
                    border: '1px solid #e5e7eb'
                }}>
                    {/* Section Header */}
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            marginBottom: '12px'
                        }}>
                            <span style={{ fontSize: '1.125rem' }}>🎨</span>
                            <h4 style={{ 
                                margin: 0, 
                                color: '#1a1a2e', 
                                fontSize: '0.9375rem',
                                fontWeight: '600',
                                letterSpacing: '-0.01em'
                            }}>Brand Kit</h4>
                        </div>
                        <BrandKitSelector 
                            currentBrandKitName={brandKit.name}
                            onBrandKitChange={() => {
                                if (hasStarted) {
                                    handleAudit();
                                }
                            }}
                        />
                    </div>
                    
                    {/* Action Buttons */}
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'stretch',
                        gap: '10px',
                        paddingTop: '16px',
                        borderTop: '1px solid #f1f5f9'
                    }}>
                        <button
                            onClick={() => setIsCreatorOpen(true)}
                            style={{
                                flex: '1',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: '#10b981',
                                color: 'white',
                                padding: '10px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.8125rem',
                                fontWeight: '600',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            + Create
                        </button>
                        
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json,application/json"
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                        />
                        <button
                            onClick={handleUploadClick}
                            disabled={isUploading}
                            style={{
                                flex: '1',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: '#0265DC',
                                color: 'white',
                                padding: '10px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: isUploading ? 'not-allowed' : 'pointer',
                                fontSize: '0.8125rem',
                                fontWeight: '600',
                                opacity: isUploading ? 0.5 : 1,
                                transition: 'all 0.15s ease'
                            }}
                        >
                            {isUploading ? 'Uploading...' : 'Upload'}
                        </button>
                        
                        {hasUploadedBrandKit() && (
                            <button
                                onClick={handleClearUploadedKit}
                                style={{
                                    flex: '1',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: '#f1f5f9',
                                    color: '#64748b',
                                    padding: '10px 16px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '0.8125rem',
                                    fontWeight: '600',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                Reset
                            </button>
                        )}
                    </div>
                    
                    {/* Error/Success Messages */}
                    {uploadError && (
                        <div style={{
                            padding: '14px 16px',
                            backgroundColor: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '10px',
                            color: '#dc2626',
                            fontSize: '0.8125rem',
                            marginTop: '14px',
                            maxHeight: '200px',
                            overflowY: 'auto',
                            lineHeight: '1.5'
                        }}>
                            <strong style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem' }}>
                                Error
                            </strong>
                            <div style={{ whiteSpace: 'pre-line' }}>
                                {uploadError}
                            </div>
                        </div>
                    )}
                    {uploadSuccess && (
                        <div style={{
                            padding: '12px 16px',
                            backgroundColor: '#ecfdf5',
                            border: '1px solid #a7f3d0',
                            borderRadius: '10px',
                            color: '#059669',
                            fontSize: '0.8125rem',
                            marginTop: '14px',
                            fontWeight: '500'
                        }}>
                            ✓ Brand kit saved successfully
                        </div>
                    )}
                </div>
                
                {/* Brand Kit Creator Modal */}
                <BrandKitCreator 
                    isOpen={isCreatorOpen}
                    onClose={() => setIsCreatorOpen(false)}
                    onSuccess={() => {
                        setUploadSuccess(true);
                        setTimeout(() => setUploadSuccess(false), 3000);
                        // Re-run audit with new brand kit
                        if (hasStarted) {
                            handleAudit();
                        }
                    }}
                />
                
                {!hasStarted ? (
                    <div className="empty-state">
                        <div style={{ marginBottom: '20px' }}>
                            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '8px' }}>🛡️</span>
                        </div>
                        <h1 style={{ 
                            color: '#1a1a2e', 
                            fontSize: '1.5rem', 
                            fontWeight: '700',
                            margin: '0 0 12px 0',
                            letterSpacing: '-0.02em'
                        }}>
                            Welcome to BrandGuard
                        </h1>
                        <p style={{ 
                            fontSize: '0.9375rem', 
                            color: '#64748b', 
                            margin: '0 0 28px 0',
                            lineHeight: '1.6',
                            maxWidth: '300px'
                        }}>
                            Audit your designs for brand compliance. Check colors, fonts, and accessibility in one click.
                        </p>
                        <button 
                            style={{ 
                                backgroundColor: '#0265DC', 
                                color: 'white', 
                                padding: '12px 28px', 
                                borderRadius: '10px', 
                                border: 'none', 
                                cursor: 'pointer', 
                                fontSize: '0.9rem',
                                fontWeight: '600',
                                boxShadow: '0 2px 8px rgba(2, 101, 220, 0.25)',
                                transition: 'all 0.15s ease'
                            }}
                            onClick={handleGetStarted}
                        >
                            Start Audit
                        </button>
                    </div>
                ) : (
                    <div>
                        {/* Tab Navigation */}
                        <div className="tab-navigation">
                            <button 
                                className={`tab-button ${activeTab === 'audit' ? 'active' : ''}`}
                                onClick={handleAuditTabClick}
                                disabled={isAuditing}
                            >
                                {isAuditing ? (
                                    <>
                                        <ShieldScanAnimation />
                                        <span className="tab-text">Scanning...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="tab-icon">🛡️</span>
                                        <span className="tab-text">Brand Audit</span>
                                    </>
                                )}
                            </button>
                            <button 
                                className={`tab-button ${activeTab === 'tone' ? 'active' : ''}`}
                                onClick={handleToneTabClick}
                                disabled={isAnalyzing}
                            >
                                {isAnalyzing ? (
                                    <>
                                        <MicrophoneAnimation />
                                        <span className="tab-text">Analyzing...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="tab-icon">🎤</span>
                                        <span className="tab-text">Check Tone</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Tab Content Panels */}
                        <div className="tab-content">
                            {/* Brand Audit Tab Panel */}
                            {activeTab === 'audit' && (
                                <div className="tab-panel">
                                    {elements && elements.length > 0 ? (
                                        <div className="scan-results">
                                            <div className="health-score-card">
                                                <div className="health-score-value" style={{ color: healthScore > 80 ? '#10b981' : healthScore > 50 ? '#f59e0b' : '#ef4444' }}>
                                                    {healthScore}%
                                                </div>
                                                <div className="health-score-label">Brand Health</div>
                                                <div className="health-score-detail">{violations.length} violation{violations.length !== 1 ? 's' : ''} found</div>
                                            </div>
                                            {/* Fix All and Undo All Buttons */}
                                            {(violations.length > 0 || fixAllSnapshot) && (
                                                <div className="action-buttons">
                                                    {violations.length > 0 && (
                                                        <Button onClick={handleFixAll} variant="accent">
                                                            Fix All Violations
                                                        </Button>
                                                    )}
                                                    {fixAllSnapshot && (
                                                        <Button onClick={handleUndoAll} variant="secondary">
                                                            Undo All
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                            {/* Violation Cards */}
                                            <div className="violation-list">
                                                {violationCards}
                                                
                                                {/* Unfixable Contrast Warnings */}
                                                {unfixableWarnings.length > 0 && (
                                                    <div className="unfixable-warnings-section">
                                                        <div className="unfixable-warnings-header">
                                                            <span className="warning-header-icon">⚠️</span>
                                                            <span>Contrast Limitations ({unfixableWarnings.length})</span>
                                                        </div>
                                                        <p className="unfixable-warnings-description">
                                                            These elements have contrast issues that cannot be fixed with your current brand colors. 
                                                            Consider updating your brand palette or changing the background color.
                                                        </p>
                                                        {unfixableWarnings.map((warning) => (
                                                            <ViolationCard
                                                                key={`warning-${warning.element.id}`}
                                                                currentColor={warning.element.fillColor || 'transparent'}
                                                                suggestedColor={warning.bestBrandColor}
                                                                onFix={() => {}} // No-op for warnings
                                                                label={`${warning.element.type} (Unfixable Contrast)${warning.element.textContent ? ` — "${warning.element.textContent}"` : ''}`}
                                                                contrastRatio={warning.currentRatio}
                                                                violationType="contrast"
                                                                isWarning={true}
                                                                isCurrentBest={warning.isCurrentBest}
                                                                warningMessage={warning.isCurrentBest 
                                                                    ? `Current contrast: ${warning.currentRatio.toFixed(1)}:1 (needs ${warning.requiredRatio}:1 for WCAG ${warning.wcagLevel}). Change background color to improve.`
                                                                    : `Best available: ${warning.bestPossibleRatio.toFixed(1)}:1 (needs ${warning.requiredRatio}:1 for WCAG ${warning.wcagLevel})`
                                                                }
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                                
                                                {violations.length === 0 && unfixableWarnings.length === 0 && (
                                                    <div className="success-message">
                                                        <span className="success-icon">✅</span>
                                                        <p>No violations found. Great job!</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="empty-state-panel">
                                            <span className="empty-icon">🛡️</span>
                                            <p>Click the tab to scan your document for brand compliance issues.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Tone Check Tab Panel */}
                            {activeTab === 'tone' && (
                                <div className="tab-panel">
                                    {isAnalyzing ? (
                                        <div className="loading-state">
                                            <BrandShield isAnimating={true} />
                                            <p>Analyzing brand voice and tone...</p>
                                        </div>
                                    ) : brandVoiceResults ? (
                                        <div className="tone-results">
                                            <div className="tone-score-card" style={{ borderColor: brandVoiceResults.score > 70 ? '#10b981' : brandVoiceResults.score > 40 ? '#f59e0b' : '#ef4444' }}>
                                                <div className="tone-score-value" style={{ color: brandVoiceResults.score > 70 ? '#10b981' : brandVoiceResults.score > 40 ? '#f59e0b' : '#ef4444' }}>
                                                    {brandVoiceResults.score}%
                                                </div>
                                                <div className="tone-score-label">Brand Voice Alignment</div>
                                                <div className="tone-gauge">
                                                    <div 
                                                        className="tone-gauge-fill" 
                                                        style={{ 
                                                            width: `${brandVoiceResults.score}%`, 
                                                            backgroundColor: brandVoiceResults.score > 70 ? '#10b981' : brandVoiceResults.score > 40 ? '#f59e0b' : '#ef4444' 
                                                        }} 
                                                    />
                                                </div>
                                            </div>
                                            <div className="tone-suggestion-card">
                                                <h4>AI Analysis & Suggestion</h4>
                                                <div className="suggestion-text">
                                                    {brandVoiceResults.suggestion || 'No suggestion available'}
                                                </div>
                                                <p className="disclaimer">AI-generated content. Please verify before use.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="empty-state-panel">
                                            <span className="empty-icon">✨</span>
                                            <p>Click the tab to analyze your document's brand voice alignment.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Theme>
    );
};

export default App;
