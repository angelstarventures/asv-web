// Shared by every client component that sends a file to a Cloud Function callable as base64
// (DocumentDropzone, PitchForm) — reads only the data after the `data:<mime>;base64,` prefix.
export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}
