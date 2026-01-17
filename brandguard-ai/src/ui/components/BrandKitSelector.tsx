import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  useBrandKitRegistry, 
  BrandKitRegistryEntry 
} from '../../hooks/useBrandKit';
import './BrandKitSelector.css';

// ============================================================================
// INTERFACES
// ============================================================================

interface BrandKitSelectorProps {
  /** Callback when the active brand kit changes */
  onBrandKitChange?: () => void;
  /** Optional current brand kit name to display */
  currentBrandKitName?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * BrandKitSelector - Dropdown menu for switching between brand kits
 * 
 * This component displays a dropdown menu listing all available brand kits
 * in the registry. When a user selects a different kit, it:
 * 1. Updates the active kit via BrandKitManager
 * 2. Triggers listeners to refresh React state
 * 3. Calls onBrandKitChange callback to refresh violations
 */
const BrandKitSelector: React.FC<BrandKitSelectorProps> = ({ 
  onBrandKitChange,
  currentBrandKitName 
}) => {
  const { registry, activeKitId, setActiveKit, deleteKit } = useBrandKitRegistry();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // State for custom delete confirmation modal (window.confirm is blocked in Adobe Express iframe)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [kitToDelete, setKitToDelete] = useState<string | null>(null);

  // --------------------------------------------------------------------------
  // HANDLERS
  // --------------------------------------------------------------------------

  /**
   * Handle clicking outside to close dropdown
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  /**
   * Handle selecting a brand kit
   */
  const handleSelectKit = useCallback(async (kitId: string) => {
    if (kitId === activeKitId) {
      setIsOpen(false);
      return;
    }

    try {
      await setActiveKit(kitId);
      setIsOpen(false);
      
      // Notify parent to refresh violations
      if (onBrandKitChange) {
        onBrandKitChange();
      }
    } catch (error) {
      console.error('Error switching brand kit:', error);
    }
  }, [activeKitId, setActiveKit, onBrandKitChange]);

  /**
   * Handle deleting a brand kit - shows custom confirmation modal
   * NOTE: window.confirm() is blocked in Adobe Express iframe sandbox
   */
  const handleDeleteKit = useCallback((e: React.MouseEvent, kitId: string) => {
    e.stopPropagation();
    
    if (kitId === 'default') {
      return; // Cannot delete default
    }

    // Show custom confirmation modal instead of window.confirm
    setKitToDelete(kitId);
    setShowDeleteConfirm(true);
  }, []);

  /**
   * Confirm deletion of the brand kit
   */
  const handleConfirmDelete = useCallback(() => {
    if (kitToDelete) {
      deleteKit(kitToDelete);
      
      // If we deleted the active kit, notify parent
      if (kitToDelete === activeKitId && onBrandKitChange) {
        onBrandKitChange();
      }
    }
    
    // Close modal and reset state
    setShowDeleteConfirm(false);
    setKitToDelete(null);
  }, [kitToDelete, deleteKit, activeKitId, onBrandKitChange]);

  /**
   * Cancel deletion
   */
  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
    setKitToDelete(null);
  }, []);

  // --------------------------------------------------------------------------
  // HELPERS
  // --------------------------------------------------------------------------

  /**
   * Get display name for the active kit
   */
  const getActiveKitName = (): string => {
    if (currentBrandKitName) {
      return currentBrandKitName;
    }
    
    const activeEntry = registry.find(entry => entry.id === activeKitId);
    if (activeEntry) {
      return activeEntry.name;
    }
    
    return 'Select Brand Kit';
  };

  /**
   * Format date for display
   */
  const formatDate = (timestamp: number): string => {
    if (timestamp === 0) return 'Built-in';
    return new Date(timestamp).toLocaleDateString();
  };

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------

  return (
    <div className="bks-container" ref={dropdownRef}>
      {/* Dropdown Trigger */}
      <button 
        className="bks-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="bks-trigger-label">Brand Kit:</span>
        <span className="bks-trigger-value">{getActiveKitName()}</span>
        <span className={`bks-trigger-arrow ${isOpen ? 'bks-trigger-arrow-up' : ''}`}>
          ▼
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="bks-dropdown" role="listbox">
          {registry.length === 0 ? (
            <div className="bks-empty">No brand kits available</div>
          ) : (
            registry.map((entry: BrandKitRegistryEntry) => (
              <div
                key={entry.id}
                className={`bks-option ${entry.id === activeKitId ? 'bks-option-active' : ''}`}
                onClick={() => handleSelectKit(entry.id)}
                role="option"
                aria-selected={entry.id === activeKitId}
              >
                <div className="bks-option-content">
                  <span className="bks-option-name">{entry.name}</span>
                  <span className="bks-option-date">{formatDate(entry.createdAt)}</span>
                </div>
                
                {entry.id === activeKitId && (
                  <span className="bks-option-check">✓</span>
                )}
                
                {!entry.isDefault && entry.id !== 'default' && (
                  <button
                    className="bks-option-delete"
                    onClick={(e) => handleDeleteKit(e, entry.id)}
                    aria-label={`Delete ${entry.name}`}
                    title="Delete this brand kit"
                  >
                    ×
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="bks-confirm-overlay" onClick={handleCancelDelete}>
          <div className="bks-confirm-modal" onClick={e => e.stopPropagation()}>
            <p className="bks-confirm-message">Are you sure you want to delete this brand kit?</p>
            <div className="bks-confirm-actions">
              <button 
                className="bks-confirm-cancel" 
                onClick={handleCancelDelete}
              >
                Cancel
              </button>
              <button 
                className="bks-confirm-delete" 
                onClick={handleConfirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrandKitSelector;
