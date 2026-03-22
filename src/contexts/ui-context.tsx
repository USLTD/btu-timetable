import { createContext } from "preact";
import { useContext, useState } from "preact/hooks";

interface UIContextType {
  // Loading states
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  
  // Dialog states
  showPrivacy: boolean;
  setShowPrivacy: (show: boolean) => void;
  showTerms: boolean;
  setShowTerms: (show: boolean) => void;
  showExportMenu: boolean;
  setShowExportMenu: (show: boolean) => void;
  showFeatureFlags: boolean;
  setShowFeatureFlags: (show: boolean) => void;
  showManualCourse: boolean;
  setShowManualCourse: (show: boolean) => void;
  
  // Focus and interaction states
  focusedSchedule: number;
  setFocusedSchedule: (index: number) => void;
  editingLabel: number | null;
  setEditingLabel: (index: number | null) => void;
  
  // Search and generation states
  hasSearched: boolean;
  setHasSearched: (searched: boolean) => void;
  limitWarning: boolean;
  setLimitWarning: (warning: boolean) => void;
  
  // Import/Export states
  showImport: boolean;
  setShowImport: (show: boolean) => void;
  importText: string;
  setImportText: (text: string) => void;
  exportHash: string;
  setExportHash: (hash: string) => void;
  
  // UI helpers
  resetUI: () => void;
}

const UIContext = createContext<UIContextType | null>(null);

export function UIProvider({ children }: { children: preact.ComponentChildren }) {
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  
  // Dialog states
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showFeatureFlags, setShowFeatureFlags] = useState(false);
  const [showManualCourse, setShowManualCourse] = useState(false);
  
  // Focus and interaction states
  const [focusedSchedule, setFocusedSchedule] = useState(0);
  const [editingLabel, setEditingLabel] = useState<number | null>(null);
  
  // Search and generation states
  const [hasSearched, setHasSearched] = useState(false);
  const [limitWarning, setLimitWarning] = useState(false);
  
  // Import/Export states
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [exportHash, setExportHash] = useState("");

  const setLoading = (loading: boolean) => {
    setIsLoading(loading);
  };

  const resetUI = () => {
    setShowPrivacy(false);
    setShowTerms(false);
    setShowExportMenu(false);
    setShowFeatureFlags(false);
    setShowManualCourse(false);
    setFocusedSchedule(0);
    setEditingLabel(null);
    setHasSearched(false);
    setLimitWarning(false);
    setShowImport(false);
    setImportText("");
    setExportHash("");
  };

  return (
    <UIContext.Provider value={{
      isLoading,
      setLoading,
      showPrivacy,
      setShowPrivacy,
      showTerms,
      setShowTerms,
      showExportMenu,
      setShowExportMenu,
      showFeatureFlags,
      setShowFeatureFlags,
      showManualCourse,
      setShowManualCourse,
      focusedSchedule,
      setFocusedSchedule,
      editingLabel,
      setEditingLabel,
      hasSearched,
      setHasSearched,
      limitWarning,
      setLimitWarning,
      showImport,
      setShowImport,
      importText,
      setImportText,
      exportHash,
      setExportHash,
      resetUI,
    }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error("useUI must be used within a UIProvider");
  }
  return context;
}
