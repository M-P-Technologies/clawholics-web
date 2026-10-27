"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/molecules";
import { adminDataChanged, adminKeys, adminQueries } from "../../lib/adminQueries";
import { isDesktopWidth } from "../../lib/viewport";
import { useStampTarget } from "../useStampTarget";
import { manilaTimeOfDay } from "../../lib/timeFormat";
import { fetchScannedClient, recordScanAction, type ScanPage, type ScanRecord, type ScannedClient } from "../../services/scanService";

/** Scans to a page of the Recent scans */
const SCANS_PAGE_SIZE = 5;

/** What the last scanned code turned out to be: a client, or why it couldn't be used */
interface LastScan {
  userId: string;
  client?: ScannedClient;
  error?: string;
}

// The loyalty scanner: the camera state, the last scan, the recent scans, and stamping or
// redeeming the scanned card
export function useAdminScanner() {
  const { getToken, isLoaded } = useAuth();
  const { user: currentUser } = useUser();
  const toast = useToast();
  const queryClient = useQueryClient();
  const stampTarget = useStampTarget();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState<LastScan | null>(null);
  // One page of the recent scans at a time, cached: coming back to the scanner shows them at once
  // (and the page before stays up while the next loads)
  const [page, setPage] = useState(1);
  const session = { getToken, clerkId: currentUser?.id };
  const historyQuery = useQuery({
    ...adminQueries.scanHistory(page, SCANS_PAGE_SIZE, session),
    enabled: isLoaded,
    placeholderData: keepPreviousData,
  });
  const history = historyQuery.data?.rows ?? [];
  const historyTotal = historyQuery.data?.total ?? 0;
  const loading = historyQuery.isPending;
  // The newest page, as the scanner changes it: a scan lands first on page 1
  const setNewest = (update: (page: ScanPage) => ScanPage) =>
    queryClient.setQueryData<ScanPage | null>(adminKeys.scanHistory(1, SCANS_PAGE_SIZE), (p) =>
      update(p ?? { rows: [], total: 0, page: 1, pageSize: SCANS_PAGE_SIZE }),
    );
  const [cameraError, setCameraError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);

  // On a phone the result sits below the camera; bring it into view when a scan lands
  useEffect(() => {
    if (lastScan && !isDesktopWidth()) resultRef.current?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
  }, [lastScan]);

  useEffect(() => {
    if (historyQuery.isError) console.error("Failed to load history on mount", historyQuery.error);
  }, [historyQuery.isError, historyQuery.error]);

  const findClient = async (userId: string): Promise<ScannedClient | null> => {
    try {
      return await fetchScannedClient(userId, await getToken(), currentUser?.id);
    } catch (error) {
      console.error("Error fetching client:", error);
      return null;
    }
  };

  /** A code was read: look its client up */
  const handleResult = async (decodedText: string) => {
    setIsScanning(false);
    try {
      const data = JSON.parse(decodedText);
      if (!data.userId) throw new Error("Invalid QR Format");
      const client = await findClient(data.userId);
      setLastScan(client ? { userId: data.userId, client } : { userId: data.userId, error: "User not found in database." });
    } catch {
      setLastScan({ userId: "Unknown", error: "Invalid Clawholics QR Code" });
    }
  };

  /** The camera's reading: the first code it found, if any */
  const handleScan = (result: { rawValue: string }[] | undefined) => {
    if (result && result.length > 0) handleResult(result[0].rawValue);
  };

  const handleScanError = (error: unknown) => {
    const errorString = String(error);
    if (errorString.includes("NotAllowedError") || errorString.includes("Permission denied")) {
      setCameraError("Camera access denied. Please enable it in your browser settings.");
      setIsScanning(false);
    } else {
      console.error("Scanner Error:", error);
    }
  };

  const recordAction = async (action: "stamp" | "redeem") => {
    if (!lastScan?.client || isProcessing) return;
    setIsProcessing(true);

    if (action === "stamp" && lastScan.client.stamps >= stampTarget) {
      toast.show("info", `${lastScan.client.name}'s card is full`, `${lastScan.client.name} has ${stampTarget} stamps. Please redeem their reward first.`);
      setIsProcessing(false);
      return;
    }

    const record: ScanRecord = {
      id: crypto.randomUUID(),
      userId: lastScan.userId,
      clientName: lastScan.client.name,
      action,
      time: manilaTimeOfDay(),
    };
    setPage(1);
    setNewest((p) => ({ ...p, rows: [record, ...p.rows].slice(0, SCANS_PAGE_SIZE), total: p.total + 1 }));
    setLastScan({ ...lastScan, client: { ...lastScan.client, stamps: action === "stamp" ? lastScan.client.stamps + 1 : 0 } });

    try {
      await recordScanAction(lastScan.userId, action, await getToken(), currentUser?.id);
      // The client's stamps show on their page (the recent scans already show this one; they're asked
      // for again so every page counts it, with the server's id)
      void adminDataChanged(queryClient);
      void queryClient.invalidateQueries({ queryKey: adminKeys.scanHistoryAll() });
      // Show the new count for a moment, then go back to scanning
      setTimeout(() => {
        setLastScan(null);
        setIsScanning(true);
        setIsProcessing(false);
      }, 1500);
    } catch (error) {
      console.error("Failed to save action to database:", error);
      // Nothing was saved: show the card and the recent scans as they were
      setNewest((p) => ({ ...p, rows: p.rows.filter((r) => r.id !== record.id), total: Math.max(0, p.total - 1) }));
      setLastScan(lastScan);
      toast.show("error", `${action === "stamp" ? "Stamp not added for" : "Reward not redeemed for"} ${lastScan.client.name}`, error instanceof Error ? error.message : "Please try again.");
      setIsProcessing(false);
    }
  };

  return {
    loading,
    /** The stamps a card needs for a reward */
    stampTarget,
    /** The scanned card's stamps, capped at the target, and whether it's full */
    shownStamps: lastScan?.client ? Math.min(lastScan.client.stamps, stampTarget) : 0,
    cardFull: !!lastScan?.client && lastScan.client.stamps >= stampTarget,
    isProcessing,
    isScanning,
    lastScan,
    history,
    /** The page of recent scans shown, the scans in all, and moving to another page */
    historyPage: { page, pageSize: SCANS_PAGE_SIZE, total: historyTotal, onPage: setPage },
    cameraError,
    resultRef,
    handleResult,
    handleScan,
    handleScanError,
    recordAction,
    startScanner: () => {
      setIsScanning(true);
      setCameraError(null);
    },
    stopScanner: () => setIsScanning(false),
    /** Clears the result and turns the camera back on */
    scanAgain: () => {
      setLastScan(null);
      setIsScanning(true);
    },
  };
}
