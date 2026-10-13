"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import AdminShell from "../components/admin/AdminShell";
import { isDesktopWidth } from "../lib/viewport";
import { Scanner } from "@yudiel/react-qr-scanner";
import { QrCode, Camera, XCircle, History, Info } from "lucide-react";
import { LoadingBar } from "../components/ui/LoadingBar";

type ScanRecord = {
  id: string;
  userId: string;
  clientName: string;
  action: "stamp" | "redeem" | "invalid";
  time: string;
};

type ClientData = {
  id: string;
  name: string;
  stamps: number;
};

import { API_BASE_URL } from "../apiConfig";
import Button from "../components/ui/Button";

const AdminScanner: React.FC = () => {
  const { getToken } = useAuth();
  const { user: currentUser } = useUser();
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState<{
    userId: string;
    client?: ClientData;
    error?: string;
  } | null>(null);
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);

  // On a phone the result sits below the camera; bring it into view when a scan lands
  useEffect(() => {
    if (lastScan && !isDesktopWidth()) resultRef.current?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
  }, [lastScan]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoading(true);
  
        const token = await getToken();
        const response = await fetch(
          `${API_BASE_URL}/users/scan-history`,
          {
            headers: { 
              Authorization: `Bearer ${token}`,
              clerk_id: currentUser?.id || "",
              "x-clawholics-origin": "frontend",
            },
          },
        );
  
        if (response.ok) {
          const data = await response.json();
          setHistory(data);
        }
      } catch (error) {
        console.error("Failed to load history on mount", error);
      } finally {
        setLoading(false);
      }
    };
  
    loadHistory();
  }, [getToken, currentUser?.id]);

  const fetchClientFromBackend = async (
    userId: string,
  ): Promise<ClientData | null> => {
    try {
      const token = await getToken();
      const response = await fetch(
        `${API_BASE_URL}/users/scan/${userId}`,
        {
          method: "GET",
          headers: { 
            Authorization: `Bearer ${token}`,
            clerk_id: currentUser?.id || "",
            "x-clawholics-origin": "frontend",
          },
        },
      );
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error("Error fetching client:", error);
      return null;
    }
  };

  const handleResult = async (decodedText: string) => {
    setIsScanning(false);
    try {
      const data = JSON.parse(decodedText);
      if (!data.userId) throw new Error("Invalid QR Format");

      const client = await fetchClientFromBackend(data.userId);
      if (client) {
        setLastScan({ userId: data.userId, client });
      } else {
        setLastScan({
          userId: data.userId,
          error: "User not found in database.",
        });
      }
    } catch {
      setLastScan({ userId: "Unknown", error: "Invalid Clawholics QR Code" });
    }
  };

  const handleScanError = (error: unknown) => {
    const errorString = String(error);
    if (
      errorString.includes("NotAllowedError") ||
      errorString.includes("Permission denied")
    ) {
      setCameraError(
        "Camera access denied. Please enable it in your browser settings.",
      );
      setIsScanning(false);
    } else {
      console.error("Scanner Error:", error);
    }
  };

  const recordAction = async (action: "stamp" | "redeem") => {
    if (!lastScan?.client || isProcessing) return;
    setIsProcessing(true);

    if (action === "stamp" && lastScan.client.stamps >= 10) {
      showToast("This client has 10 stamps! Please redeem their reward.");
      setIsProcessing(false);
      return;
    }

    const rec: ScanRecord = {
      id: crypto.randomUUID(),
      userId: lastScan.userId,
      clientName: lastScan.client.name,
      action: action,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setHistory((h) => [rec, ...h].slice(0, 10));

    const newStamps = action === "stamp" ? lastScan.client.stamps + 1 : 0;
    setLastScan({
      ...lastScan,
      client: { ...lastScan.client, stamps: newStamps },
    });

    try {
      const token = await getToken();
      const endpoint = action === "stamp" ? "stamp" : "redeem";

      await fetch(
        `${API_BASE_URL}/users/scan/${lastScan.userId}/${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            clerk_id: currentUser?.id || "",
            "x-clawholics-origin": "frontend",
          },
        },
      );

      setTimeout(() => {
        setLastScan(null);
        setIsScanning(true);
        setIsProcessing(false);
      }, 1500);
    } catch (error) {
      console.error("Failed to save action to database:", error);
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-light-orange">
        <LoadingBar label="Loading the scanner" />
      </div>
    );
  }

  return (
    <AdminShell title="Loyalty QR Scanner">
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto pb-2 md:gap-6">
        <div className="grid shrink-0 grid-cols-1 items-stretch gap-8 max-lg:contents xl:grid-cols-3">
            <div className="xl:col-span-2 bg-milk border border-crimson-light/40 rounded-2xl p-4 md:p-8 shadow-petal flex flex-col gap-4 h-full max-lg:order-1">
              <h1 className="font-montserrat text-lg text-gray-red font-bold flex items-center gap-2">
                <QrCode size={20} /> QR Scanner
              </h1>

              {cameraError && (
                <div className="bg-danger/10 border border-danger text-danger px-8 py-4 rounded-sm text-center font-sans shadow-sm flex items-center justify-center gap-2 animate-in fade-in">
                  <XCircle size={20} className="shrink-0" />
                  <p className="text-sm font-bold">{cameraError}</p>
                </div>
              )}

              <div className="relative aspect-square md:aspect-video xl:aspect-21/9 w-full overflow-hidden rounded-xl bg-crimson-light/40 border border-crimson/20 flex items-center justify-center mb-8">
                {isScanning ? (
                  <Scanner
                    onScan={(result) => {
                      if (result && result.length > 0) {
                        handleResult(result[0].rawValue);
                      }
                    }}
                    onError={handleScanError}
                    styles={{ container: { width: "100%", height: "100%" } }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-gray-red/40 gap-2">
                    <Camera size={40} />
                    <p className="text-sm">Camera is off</p>
                  </div>
                )}
              </div>

              <div className="mt-auto">
                {!isScanning ? (
                  <Button
                    onClick={() => {
                      setIsScanning(true);
                      setCameraError(null);
                    }}
                    className="w-full flex justify-center items-center gap-2 max-lg:py-4"
                  >
                    Start Scanner
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => setIsScanning(false)}
                    className="w-full flex justify-center items-center gap-2 max-lg:py-4"
                  >
                    Stop Scanner
                  </Button>
                )}
              </div>
            </div>

            <div className="bg-milk border border-crimson-light/40 rounded-2xl p-4 md:p-8 shadow-petal flex flex-col gap-4 h-full min-h-75 xl:min-h-0 max-lg:order-3">
              <h1 className="font-montserrat font-bold text-lg text-gray-red flex items-center gap-2 shrink-0">
                <History size={20} /> History
              </h1>

              <div className="relative flex-1">
                <div className="absolute inset-0 overflow-y-auto pr-2 space-y-4">
                  {history.length === 0 ? (
                    <p className="text-sm text-gray-red/50 text-center py-4">
                      No recent scans.
                    </p>
                  ) : (
                    history.map((h) => (
                      <div
                        key={h.id}
                        className="flex items-center justify-between p-4 md:p-4 rounded-xl border border-crimson/20 bg-crimson-light/40"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="font-bold text-sm text-gray-red truncate">
                            {h.clientName}
                          </p>
                          <p className="text-sm text-gray-red/60">
                            {h.action === "stamp"
                              ? "Earned Stamp"
                              : "Redeemed Reward"}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-gray-red/70 shrink-0">
                          {h.time}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div ref={resultRef} className="bg-milk border border-crimson-light/40 rounded-2xl p-4 md:p-8 shadow-petal flex flex-col gap-4 shrink-0 max-lg:order-2">
            <h1 className="font-montserrat font-bold text-lg text-gray-red">
              Scan Result
            </h1>

            {!lastScan && (
              <p className="text-sm text-gray-red/50 italic">
                Waiting for scan...
              </p>
            )}

            {lastScan && lastScan.error && (
              <div className="flex items-center justify-between bg-crimson-light/40 p-4 rounded-xl border border-crimson/20">
                <div className="flex items-center gap-4 text-gray-red">
                  <XCircle size={24} className="shrink-0" />
                  <span className="font-bold text-sm md:text-base">
                    {lastScan.error}
                  </span>
                </div>
                <Button
                  onClick={() => setLastScan(null)}
                  className="md:px-8 hover:border"
                >
                  Clear
                </Button>
              </div>
            )}

            {lastScan?.client && (
              <div className="relative flex flex-col md:flex-row flex-wrap items-center justify-between bg-crimson-light/20 p-4 md:p-8 rounded-xl border border-crimson/10 w-full gap-8">
                <Button
                  variant="bare"
                  onClick={() => {
                    setLastScan(null);
                    setIsScanning(true);
                  }}
                  className="absolute top-3 right-3 md:top-4 md:right-4 text-gray-red hover:text-gray-red/40 transition-colors z-10"
                >
                  <XCircle size={24} />
                </Button>

                <div className="w-full md:w-auto text-center md:text-left flex-1 min-w-50">
                  <p className="text-xl md:text-2xl font-bold text-gray-red md:pr-8 truncate">
                    {lastScan.client.name}
                  </p>
                  <p className="text-sm text-gray-red/60">
                    ID: {lastScan.userId}
                  </p>

                  <p className="text-3xl md:text-4xl font-black text-gray-red">
                    {lastScan.client.stamps}{" "}
                    <span className="text-xl md:text-2xl text-gray-red/50 font-bold">
                      / 10
                    </span>
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 md:gap-4 w-full md:w-auto md:pr-8 shrink-0">
                  <Button
                    onClick={() => recordAction("stamp")}
                    disabled={isProcessing}
                    className="flex-1 md:flex-none md:px-8 hover:scale-[1.02] disabled:hover:scale-100 disabled:hover:bg-crimson md:text-base"
                  >
                    Award Stamp
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={() => recordAction("redeem")}
                    disabled={lastScan.client.stamps < 10 || isProcessing}
                    className="flex-1 md:flex-none md:px-8 disabled:hover:bg-light-orange md:text-base"
                  >
                    Redeem Reward
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

      {toastMessage && (
        <div className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-50 bg-crimson text-light-orange px-4 py-4 rounded-sm shadow-xl border border-crimson/20 flex items-center gap-4 max-w-sm animate-in slide-in-from-bottom-6 fade-in duration-300">
          <div className="bg-light-orange/20 p-1.5 rounded-md shrink-0">
            <Info size={20} className="text-light-orange" />
          </div>
          <p className="font-bold text-sm md:text-base leading-snug text-light-orange">
            {toastMessage}
          </p>
          <Button
            variant="bare"
            onClick={() => setToastMessage(null)}
            className="ml-auto text-light-orange/70 hover:text-light-orange transition-colors shrink-0"
          >
            <XCircle size={20} />
          </Button>
        </div>
      )}
    </AdminShell>
  );
};

export default AdminScanner;