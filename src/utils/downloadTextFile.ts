/** Saves text as a file in the browser (a calendar file opens in the calendar app on a phone) */
export function downloadTextFile(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // After the browser has started the download
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
