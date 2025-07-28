import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism";

import ScreenshotQueue from "../components/Queue/ScreenshotQueue";
import SolutionCommands from "../components/Solutions/SolutionCommands";
import Debug from "./Debug";
import { useToast } from "../contexts/toast";
import { COMMAND_KEY } from "../utils/platform";

// ---- Type Definitions ----
export interface ProblemStatementData {
  problem_statement: string;
}

export interface Solution {
  code: string;
  thoughts: string[];
  time_complexity: string;
  space_complexity: string;
}

// ---- Helper Functions ----
// NOTE: Debounce is no longer used by the ResizeObserver but can be kept for other purposes.
function debounce<F extends (...args: any[]) => void>(func: F, wait: number) {
  let timeoutId: number | undefined;
  return (...args: Parameters<F>) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      func(...args);
    }, wait);
  };
}

// ---- Memoized Presentational Components ----
// FIX: Removed `content-visibility` to prevent scrolling conflicts.

export const ContentSection = React.memo(
  ({
    title,
    content,
    isLoading,
  }: {
    title: string;
    content: React.ReactNode;
    isLoading: boolean;
  }) => (
    <div className="space-y-2">
      <h2 className="text-[13px] font-medium text-white/70 tracking-wide">{title}</h2>
      {isLoading ? (
        <div className="mt-4 flex">
          <p className="text-xs text-white/40 animate-pulse">Extracting problem statement...</p>
        </div>
      ) : (
        <div className="text-[13px] leading-[1.4] text-white/60 max-w-[600px]">{content}</div>
      )}
    </div>
  )
);

const SolutionSection = React.memo(
  ({
    title,
    content,
    isLoading,
    currentLanguage,
  }: {
    title: string;
    content: React.ReactNode;
    isLoading: boolean;
    currentLanguage: string;
  }) => {
    const [copied, setCopied] = useState(false);

    const copyToClipboard = () => {
      if (typeof content === "string") {
        navigator.clipboard.writeText(content).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }
    };

    return (
      <div className="space-y-2 relative">
        <h2 className="text-[13px] font-medium text-white/70 tracking-wide">{title}</h2>
        {isLoading ? (
          <div className="mt-4 flex">
            <p className="text-xs text-white/40 animate-pulse">Loading solutions...</p>
          </div>
        ) : (
          <div
            className="w-full relative"
            style={{
              transform: "translateZ(0)",
            }}
          >
            <button
              onClick={copyToClipboard}
              className="absolute top-2 right-2 text-xs text-white/80 bg-white/10 hover:bg-white/20 rounded px-2 py-1 transition"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
            <SyntaxHighlighter
              showLineNumbers
              language={currentLanguage === "golang" ? "go" : currentLanguage}
              style={dracula}
              customStyle={{
                maxWidth: "100%",
                margin: 0,
                padding: "1rem",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                backgroundColor: "rgba(22, 27, 34, 0.15)",
                fontSize: "13px",
                lineHeight: "1.4",
              }}
              wrapLongLines={true}
            >
              {content as string}
            </SyntaxHighlighter>
          </div>
        )}
      </div>
    );
  }
);

export const ComplexitySection = React.memo(
  ({
    timeComplexity,
    spaceComplexity,
    isLoading,
  }: {
    timeComplexity: string | null;
    spaceComplexity: string | null;
    isLoading: boolean;
  }) => {
    const formatComplexity = (complexity: string | null): string => {
      if (!complexity || complexity.trim() === "") return "N/A";
      const bigORegex = /O\([^)]+\)/i;
      return bigORegex.test(complexity) ? complexity : `O(${complexity})`;
    };

    return (
      <div className="space-y-2">
        <h2 className="text-[13px] font-medium text-white/70 tracking-wide">Complexity</h2>
        {isLoading ? (
          <p className="text-xs text-white/40 animate-pulse">Calculating complexity...</p>
        ) : (
          <div className="space-y-3">
            <div className="text-[13px] leading-[1.4] text-white/60 bg-white/10 rounded-md p-3">
              <strong>Time:</strong> {formatComplexity(timeComplexity)}
            </div>
            <div className="text-[13px] leading-[1.4] text-white/60 bg-white/10 rounded-md p-3">
              <strong>Space:</strong> {formatComplexity(spaceComplexity)}
            </div>
          </div>
        )}
      </div>
    );
  }
);


// ---- Main Component ----

export interface SolutionsProps {
  setView: (view: "queue" | "solutions" | "debug") => void;
  credits: number;
  currentLanguage: string;
  setLanguage: (language: string) => void;
}

const MAX_SCREENSHOTS = 100;

const Solutions: React.FC<SolutionsProps> = ({
  setView,
  credits,
  currentLanguage,
  setLanguage,
}) => {
  const queryClient = useQueryClient();
  const contentRef = useRef<HTMLDivElement>(null); // Still useful for other purposes if needed
  const { showToast } = useToast();

  const [debugProcessing, setDebugProcessing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [extraScreenshots, setExtraScreenshots] = useState<
    { id: string; path: string; preview: string; timestamp: number }[]
  >([]);

  const { data: problemStatementData } = useQuery<ProblemStatementData>({
    queryKey: ["problem_statement"],
    enabled: false,
  });

  const { data: solutionData } = useQuery<Solution>({
    queryKey: ["solution"],
    enabled: false,
  });
  
  const { data: newSolutionData } = useQuery<Solution>({
    queryKey: ["new_solution"],
    enabled: false,
  });

  const onScreenshotTaken = useCallback(async () => {
    try {
      const existing = await window.electronAPI.getScreenshots();
      const screenshots = (Array.isArray(existing) ? existing : [])
        .map((p: any) => ({
          id: p.path,
          path: p.path,
          preview: p.preview,
          timestamp: Date.now(),
        }))
        .slice(-MAX_SCREENSHOTS);
      setExtraScreenshots(screenshots);
    } catch (error) {
      console.error("Error loading extra screenshots:", error);
    }
  }, []);

  const onResetView = useCallback(() => {
    setIsResetting(true);
    queryClient.removeQueries({ queryKey: ["solution"] });
    queryClient.removeQueries({ queryKey: ["new_solution"] });
    setExtraScreenshots([]);
    setTimeout(() => setIsResetting(false), 0);
  }, [queryClient]);

  const onSolutionStart = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["solution"] });
  }, [queryClient]);

  const onProblemExtracted = useCallback(
    (data: ProblemStatementData) => {
      queryClient.setQueryData(["problem_statement"], data);
    },
    [queryClient]
  );

  const onSolutionError = useCallback(
    (error: string) => {
      showToast("Processing Failed", error, "error");
      const currentSolution = queryClient.getQueryData(["solution"]);
      if (!currentSolution) {
        setView("queue");
      }
      console.error("Processing error:", error);
    },
    [queryClient, setView, showToast]
  );
  
  const onSolutionSuccess = useCallback(
    (data: Solution) => {
      if (!data) {
        console.warn("Received empty or invalid solution data");
        return;
      }
      queryClient.setQueryData(["solution"], data);
      onScreenshotTaken();
    },
    [queryClient, onScreenshotTaken]
  );
  
  const onDebugStart = useCallback(() => setDebugProcessing(true), []);
  
  const onDebugSuccess = useCallback((data: Solution) => {
      queryClient.setQueryData(["new_solution"], data);
      setDebugProcessing(false);
  }, [queryClient]);

  const onDebugError = useCallback(() => {
    showToast("Processing Failed", "There was an error debugging your code.", "error");
    setDebugProcessing(false);
  }, [showToast]);

  const onProcessingNoScreenshots = useCallback(() => {
    showToast("No Screenshots", "There are no extra screenshots to process.", "neutral");
  }, [showToast]);

  useEffect(() => {
    onScreenshotTaken();

    // FIX: REMOVED the ResizeObserver and updateContentDimensions logic
    // to prevent the re-render feedback loop.

    const unregisterFunctions = [
        window.electronAPI.onScreenshotTaken(onScreenshotTaken),
        window.electronAPI.onResetView(onResetView),
        window.electronAPI.onSolutionStart(onSolutionStart),
        window.electronAPI.onProblemExtracted(onProblemExtracted),
        window.electronAPI.onSolutionError(onSolutionError),
        window.electronAPI.onSolutionSuccess(onSolutionSuccess),
        window.electronAPI.onDebugStart(onDebugStart),
        window.electronAPI.onDebugSuccess(onDebugSuccess),
        window.electronAPI.onDebugError(onDebugError),
        window.electronAPI.onProcessingNoScreenshots(onProcessingNoScreenshots),
    ];

    return () => {
      unregisterFunctions.forEach(unregister => unregister && unregister());
    };
  }, [
    onScreenshotTaken, onResetView, onSolutionStart, onProblemExtracted, 
    onSolutionError, onSolutionSuccess, onDebugStart, onDebugSuccess, 
    onDebugError, onProcessingNoScreenshots
  ]);

  const handleDeleteExtraScreenshot = async (index: number) => {
    const screenshotToDelete = extraScreenshots[index];
    try {
      const response = await window.electronAPI.deleteScreenshot(screenshotToDelete.path);
      if (response.success) {
        onScreenshotTaken();
      } else {
        showToast("Error", "Failed to delete the screenshot", "error");
      }
    } catch (error) {
      showToast("Error", "Failed to delete the screenshot", "error");
    }
  };

  return (
    <>
      {!isResetting && newSolutionData ? (
        <Debug
          isProcessing={debugProcessing}
          setIsProcessing={setDebugProcessing}
          currentLanguage={currentLanguage}
          setLanguage={setLanguage}
        />
      ) : (
        <div
          ref={contentRef}
          style={{
            maxHeight: "calc(100vh - 80px)",
            overflowY: "auto",
            padding: "16px",
            WebkitOverflowScrolling: "touch",
          }}
          className="relative bg-black/25"
        >
          {solutionData && (
            <div className="mb-4">
              <ScreenshotQueue
                isLoading={debugProcessing}
                screenshots={extraScreenshots}
                onDeleteScreenshot={handleDeleteExtraScreenshot}
              />
            </div>
          )}

          <div className="mb-4">
            <SolutionCommands
              onTooltipVisibilityChange={() => {}}
              isProcessing={!problemStatementData || !solutionData}
              extraScreenshots={extraScreenshots}
              credits={credits}
              currentLanguage={currentLanguage}
              setLanguage={setLanguage}
            />
          </div>

          <div className="space-y-4">
            {!solutionData && (
              <ContentSection
                title="Problem Statement"
                content={problemStatementData?.problem_statement}
                isLoading={!problemStatementData}
              />
            )}

            {solutionData?.thoughts && (
              <ContentSection
                title={`My Thoughts (${COMMAND_KEY} + Arrow keys to scroll)`}
                isLoading={false}
                content={
                  <div className="space-y-3 text-white/60">
                    {solutionData.thoughts.map((thought, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <div className="w-1 h-1 rounded-full bg-blue-400/60 mt-2 shrink-0" />
                        <div>{thought}</div>
                      </div>
                    ))}
                  </div>
                }
              />
            )}

            {solutionData?.code && (
              <SolutionSection
                title="Solution"
                content={solutionData.code}
                isLoading={false}
                currentLanguage={currentLanguage}
              />
            )}

            {solutionData?.time_complexity && solutionData?.space_complexity && (
              <ComplexitySection
                timeComplexity={solutionData.time_complexity}
                spaceComplexity={solutionData.space_complexity}
                isLoading={false}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Solutions;