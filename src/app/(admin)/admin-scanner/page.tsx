"use client";

import { Scanner } from "@yudiel/react-qr-scanner";
import { Camera, Check, History, QrCode, Stamp, XCircle } from "lucide-react";
import AdminShell from "@/components/features/admin/shell/AdminShell";
import { initialsOf, Button } from "@/components/atoms";
import { ScannerSkeleton } from "@/components/features/admin/skeletons/skeletons";
import { SectionHeader } from "@/components/molecules";
import { useAdminScanner } from "@/hooks/admin/useAdminScanner";

// The loyalty QR scanner: the camera, the scanned client's card with its stamps, and the recent
// scans. Its state and actions are in hooks/admin/useAdminScanner.
export default function AdminScanner() {
  const { loading, stampTarget, shownStamps, cardFull, isProcessing, isScanning, lastScan, history, cameraError, resultRef, handleScan, handleScanError, recordAction, startScanner, stopScanner, scanAgain } = useAdminScanner();

  if (loading) return <ScannerSkeleton />;

  return (
    <AdminShell title="Loyalty QR Scanner">
      <div className="flex flex-1 flex-col overflow-y-auto pb-2">
        {/* Desktop: the camera (2/3) with the result and the recent scans beside it. Phone: camera,
            result, recent scans, one under the other. */}
        <div className="grid grid-cols-1 gap-3 md:gap-6 max-lg:flex max-lg:flex-col xl:grid-cols-3">
          <div className="flex h-full flex-col gap-3 rounded-2xl border border-crimson-light/40 bg-milk p-6 shadow-petal max-lg:order-1 xl:col-span-2">
            <SectionHeader size="card" icon={QrCode} title="Scanner" />

            {cameraError && (
              <div role="alert" className="flex items-center gap-3 rounded-xl bg-danger/10 px-3 py-3 text-[13px] font-bold text-danger-ink">
                <XCircle size={18} className="shrink-0" aria-hidden="true" />
                {cameraError}
              </div>
            )}

            <div
              className={`relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl md:aspect-video ${
                isScanning ? "bg-gray-red" : "border-2 border-dashed border-crimson-light bg-crimson-light/15"
              }`}
            >
              {isScanning ? (
                <Scanner
                  onScan={handleScan}
                  onError={handleScanError}
                  styles={{ container: { width: "100%", height: "100%" } }}
                />
              ) : (
                <div className="flex max-w-xs flex-col items-center gap-3 px-3 text-center text-gray-red">
                  <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-full bg-crimson-light/40 text-berry">
                    <Camera size={22} />
                  </span>
                  <p className="font-display text-lg">Camera is off</p>
                  <p className="text-[13px] text-gray-red">Start the scanner, then hold the client&apos;s loyalty QR code up to the camera.</p>
                </div>
              )}
              {/* The scan frame's corners */}
              <span aria-hidden="true" className="pointer-events-none absolute left-4 top-4 h-8 w-8 rounded-tl-xl border-l-4 border-t-4 border-crimson" />
              <span aria-hidden="true" className="pointer-events-none absolute right-4 top-4 h-8 w-8 rounded-tr-xl border-r-4 border-t-4 border-crimson" />
              <span aria-hidden="true" className="pointer-events-none absolute bottom-4 left-4 h-8 w-8 rounded-bl-xl border-b-4 border-l-4 border-crimson" />
              <span aria-hidden="true" className="pointer-events-none absolute bottom-4 right-4 h-8 w-8 rounded-br-xl border-b-4 border-r-4 border-crimson" />
            </div>

            <div className="mt-auto">
              {!isScanning ? (
                <Button onClick={startScanner} className="w-full max-lg:py-3">
                  <Camera size={16} aria-hidden="true" />
                  Start scanner
                </Button>
              ) : (
                <Button variant="secondary" onClick={stopScanner} className="w-full max-lg:py-3">
                  Stop scanner
                </Button>
              )}
            </div>
          </div>

          <div className="flex min-h-0 flex-col gap-3 md:gap-6 max-lg:contents">
            <div ref={resultRef} className="flex flex-col gap-3 rounded-2xl border border-crimson-light/40 bg-milk p-6 shadow-petal max-lg:order-2">
              <SectionHeader size="card" icon={Stamp} title="Scan result" />

              {!lastScan && (
                <p className="rounded-xl bg-crimson-light/15 px-3 py-6 text-center text-[13px] text-gray-red">
                  Waiting for a scan. The client&apos;s name and stamps show here.
                </p>
              )}

              {lastScan?.error && (
                <div role="alert" className="flex flex-col gap-3 rounded-xl bg-danger/10 p-3 text-gray-red">
                  <p className="flex items-center gap-3 text-sm font-bold">
                    <XCircle size={20} className="shrink-0 text-danger-ink" aria-hidden="true" />
                    {lastScan.error}
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={scanAgain}
                    className="self-start px-3! py-1.5! text-[13px]"
                  >
                    Scan again
                  </Button>
                </div>
              )}

              {lastScan?.client && (
                <div className="relative flex flex-col gap-3 rounded-xl bg-crimson-light/20 p-3">
                  <Button
                    variant="bare"
                    aria-label="Close and scan again"
                    onClick={scanAgain}
                    className="absolute right-2 top-2 rounded-full p-1.5 text-gray-red hover:bg-crimson-light/40 hover:text-gray-red"
                  >
                    <XCircle size={20} aria-hidden="true" />
                  </Button>

                  <div className="flex items-center gap-3 pr-9">
                    <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-crimson-light/60 font-display text-lg text-berry">
                      {initialsOf(lastScan.client.name)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-display text-2xl leading-tight text-gray-red">{lastScan.client.name}</span>
                      <span className="block truncate text-xs text-gray-red">ID: {lastScan.userId}</span>
                    </span>
                  </div>

                  {/* The loyalty card: ten stamps, filled for each one earned */}
                  <div className="flex flex-col gap-3">
                    <p className="flex items-baseline justify-between text-[13px] font-medium text-gray-red">
                      Stamps
                      <span className="font-display text-xl text-berry">
                        {shownStamps}
                        <span className="text-sm text-gray-red"> / {stampTarget}</span>
                      </span>
                    </p>
                    <ol aria-label={`${shownStamps} of ${stampTarget} stamps`} className="grid grid-cols-5 gap-3">
                      {Array.from({ length: stampTarget }, (_, i) => (
                        <li
                          key={i}
                          aria-hidden="true"
                          className={`flex aspect-square items-center justify-center rounded-full ${
                            i < lastScan.client!.stamps ? "bg-crimson text-light-orange shadow-sm" : "border-2 border-dashed border-crimson-light"
                          }`}
                        >
                          {i < lastScan.client!.stamps && <Check size={16} strokeWidth={3} />}
                        </li>
                      ))}
                    </ol>
                    {cardFull && <p className="text-[13px] font-bold text-berry">The card is full: the reward is ready to redeem.</p>}
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button onClick={() => recordAction("stamp")} disabled={isProcessing} className="flex-1">
                      Award stamp
                    </Button>
                    <Button variant="secondary" onClick={() => recordAction("redeem")} disabled={!cardFull || isProcessing} className="flex-1">
                      Redeem reward
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex min-h-75 flex-1 flex-col gap-3 rounded-2xl border border-crimson-light/40 bg-milk p-6 shadow-petal max-lg:order-3 xl:min-h-0">
              <SectionHeader size="card" icon={History} title="Recent scans" />

              <div className="relative flex-1">
                <ul className="absolute inset-0 overflow-y-auto pr-1">
                  {history.length === 0 ? (
                    <li className="py-3 text-center text-[13px] text-gray-red">No recent scans.</li>
                  ) : (
                    history.map((h) => (
                      <li key={h.id} className="flex items-center gap-3 border-t border-dotted border-crimson-light py-3 first:border-t-0">
                        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-crimson-light/50 font-display text-sm text-berry">
                          {initialsOf(h.clientName)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-gray-red">{h.clientName}</span>
                          <span
                            className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-bold ${
                              h.action === "stamp" ? "bg-crimson-light/50 text-berry" : "bg-success/20 text-gray-red"
                            }`}
                          >
                            {h.action === "stamp" ? "Stamp" : "Reward redeemed"}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs text-gray-red">{h.time}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
