"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminDataChanged, adminKeys, adminQueries } from "../../../lib/tanstack-query/adminQueries";
import { useToast } from "../../../components/ui/ToastProvider";
import { isDesktopWidth } from "../../../lib/viewport";
import { useStampTarget } from "./useStampTarget";
import { fetchScannedClient, recordScanAction, type ScanRecord, type ScannedClient } from "../api/scanService";

/** What the last scanned code turned out to be: a client, or why it couldn't be used */
export interface LastScan {
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
  // The recent scans, cached: coming back to the scanner shows them at once
  const historyQuery = useQuery({ ...adminQueries.scanHistory({ getToken, clerkId: currentUser?.id }), enabled: isLoaded });
  const history = historyQuery.data ?? [];
  const loading = historyQuery.isPending;
  const setHistory = (update: (h: ScanRecord[]) => ScanRecord[]) =>
    queryClient.setQueryData<ScanRecord[] | null>(adminKeys.scanHistory(), (h) => update(h ?? []));
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
      toast.show("info", "The card is full", `This client has ${stampTarget} stamps. Please redeem their reward first.`);
      setIsProcessing(false);
      return;
    }

    const record: ScanRecord = {
      id: crypto.randomUUID(),
      userId: lastScan.userId,
      clientName: lastScan.client.name,
      action,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setHistory((h) => [record, ...h].slice(0, 10));
    setLastScan({ ...lastScan, client: { ...lastScan.client, stamps: action === "stamp" ? lastScan.client.stamps + 1 : 0 } });

    try {
      await recordScanAction(lastScan.userId, action, await getToken(), currentUser?.id);
      // The client's stamps show on their page (the recent scans already show this one)
      void adminDataChanged(queryClient);
      // Show the new count for a moment, then go back to scanning
      setTimeout(() => {
        setLastScan(null);
        setIsScanning(true);
        setIsProcessing(false);
      }, 1500);
    } catch (error) {
      console.error("Failed to save action to database:", error);
      // Nothing was saved: show the card and the recent scans as they were
      setHistory((h) => h.filter((r) => r.id !== record.id));
      setLastScan(lastScan);
      toast.show("error", action === "stamp" ? "Stamp not added" : "Reward not redeemed", error instanceof Error ? error.message : "Please try again.");
      setIsProcessing(false);
    }
  };

  return {
    loading,
    /** The stamps a card needs for a reward */
    stampTarget,
    isProcessing,
    isScanning,
    lastScan,
    history,
    cameraError,
    resultRef,
    handleResult,
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
