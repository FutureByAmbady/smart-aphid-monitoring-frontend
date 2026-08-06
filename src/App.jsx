import React, { useRef, useState } from "react";
import {
  Bug,
  UploadCloud,
  ScanSearch,
  Clock,
  Target,
  X,
  CheckCircle2,
  FileImage,
  AlertTriangle,
} from "lucide-react";

/* -------------------------------- Constants ------------------------------- */
const API_BASE = "https://disarray-slapstick-judgingly.ngrok-free.dev";

const DETECT_ENDPOINT = `${API_BASE}/detect`;

/* ------------------------------- Components ------------------------------- */

function Header() {
  return (
    <header className="w-full border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#2E7D32]">
          <Bug className="h-6 w-6 text-white" strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-gray-900 sm:text-xl">
            Smart Aphid Monitoring System
          </h1>
          <p className="text-sm text-gray-500">
            AI-based Yellow Sticky Trap Insect Detection
          </p>
        </div>
      </div>
    </header>
  );
}

function UploadZone({ onFileSelected, hasImage }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");

  const handleFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, WEBP).");
      return;
    }
    setError("");
    const reader = new FileReader();
    reader.onload = (e) =>
      onFileSelected({ dataUrl: e.target.result, name: file.name, size: file.size });
    reader.readAsDataURL(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files && e.dataTransfer.files[0]);
  };

  return (
    <div>
      <div
        onClick={() => inputRef.current && inputRef.current.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center ${
          isDragging
            ? "border-[#2E7D32] bg-[#2E7D32]/5"
            : "border-gray-300 bg-white hover:border-gray-400"
        }`}
      >
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
          <UploadCloud className="h-7 w-7 text-[#2E7D32]" strokeWidth={1.8} />
        </div>
        <p className="text-sm font-semibold text-gray-800">
          Drag &amp; drop your trap image here
        </p>
        <p className="mt-1 text-xs text-gray-500">PNG, JPG or WEBP · up to 10 MB</p>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current && inputRef.current.click();
          }}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#2E7D32] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#256628]"
        >
          <FileImage className="h-4 w-4" />
          Choose Image
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            handleFile(e.target.files && e.target.files[0]);
            e.target.value = "";
          }}
        />
      </div>

      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
      {hasImage && (
        <p className="mt-2 text-xs text-gray-500">
          Tip: you can drop a new image anytime to replace the current one.
        </p>
      )}
    </div>
  );
}

function PreviewPanel({ image, onClear }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Preview — Original Image
        </span>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          <X className="h-3.5 w-3.5" />
          Remove
        </button>
      </div>

      <div className="flex justify-center rounded-lg bg-gray-100 p-3">
        <img
          src={image.dataUrl}
          alt="Uploaded sticky trap preview"
          className="max-h-80 w-auto rounded-md object-contain"
        />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <span className="truncate font-medium text-gray-700">{image.name}</span>
        <span className="ml-3 shrink-0">{formatFileSize(image.size)}</span>
      </div>
    </div>
  );
}

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" strokeWidth={2} />
      <div>
        <p className="text-sm font-semibold text-red-800">Detection failed</p>
        <p className="mt-1 text-sm text-red-700">{message}</p>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, unit }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-[#2E7D32]" strokeWidth={2} />
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {label}
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-3xl font-bold tracking-tight text-gray-900">{value}</span>
        {unit && <span className="text-sm font-medium text-gray-500">{unit}</span>}
      </div>
    </div>
  );
}

function ResultSection({ result }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-[#2E7D32]" strokeWidth={2} />
        <h2 className="text-base font-bold text-gray-900">Detection Result</h2>
      </div>

      <div className="flex justify-center rounded-lg bg-gray-100 p-3">
        <img
          src={result.annotatedImage}
          alt="Annotated detection result"
          className="max-h-96 w-auto rounded-md object-contain"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Bug} label="Total Insects" value={result.totalInsects} />
        <StatCard
          icon={Target}
          label="Avg. Confidence"
          value={result.avgConfidence}
          unit="%"
        />
        <StatCard
          icon={Clock}
          label="Processing Time"
          value={result.processingTime}
          unit="ms"
        />
      </div>
    </section>
  );
}

/* ---------------------------------- Utils --------------------------------- */

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/* ----------------------------------- App ---------------------------------- */

export default function App() {
  const [image, setImage] = useState(null);
  const [detecting, setDetecting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleFileSelected = (imgData) => {
    setImage(imgData);
    setResult(null);
    setError("");
  };

  const handleClear = () => {
    setImage(null);
    setResult(null);
    setError("");
  };

  const handleDetect = async () => {
    if (!image || detecting) return;

    setDetecting(true);
    setError("");
    setResult(null);

    try {
      // Convert the preview image (data URL) into a Blob
      const blobResponse = await fetch(image.dataUrl);
      if (!blobResponse.ok) {
        throw new Error("Could not read the selected image. Please try again.");
      }
      const blob = await blobResponse.blob();

      // Build multipart/form-data request
      const formData = new FormData();
      formData.append("file", blob, image.name);

      // Send to FastAPI backend
      const response = await fetch(DETECT_ENDPOINT, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(
          `The detection server responded with status ${response.status}. Please try again.`
        );
      }

      const data = await response.json();

      if (
        typeof data.count === "undefined" ||
        typeof data.confidence === "undefined" ||
        typeof data.processing_time_ms === "undefined" ||
        !data.image
      ) {
        throw new Error("The detection server returned an unexpected response format.");
      }

      setResult({
        annotatedImage: `${API_BASE}${data.image}`,
        totalInsects: data.count,
        avgConfidence: (data.confidence * 100).toFixed(1),
        processingTime: Math.round(data.processing_time_ms),
      });
    } catch (err) {
      if (err instanceof TypeError) {
        // Network-level failure (backend unreachable)
        setError(
"Unable to connect to the detection server. Please try again in a few seconds."        
        );
      } else {
        setError(err.message || "Something went wrong while processing the image.");
      }
    } finally {
      setDetecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <style>{`
        @import url('https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/index.min.css');
        body { font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif; }
      `}</style>

      <Header />

      <main className="mx-auto flex max-w-3xl flex-col items-center px-6 py-12">
        <div className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">
              Upload Trap Image
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Upload a photo of a yellow sticky trap to detect aphids with AI.
            </p>
          </div>

          <div className="space-y-6">
            {/* 1. Upload */}
            <UploadZone onFileSelected={handleFileSelected} hasImage={!!image} />

            {/* 2. Preview */}
            {image && <PreviewPanel image={image} onClear={handleClear} />}

            {/* 3. Detect button */}
            {image && (
              <button
                type="button"
                onClick={handleDetect}
                disabled={detecting}
                className={`flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-base font-bold text-white ${
                  detecting
                    ? "cursor-not-allowed bg-gray-400"
                    : "bg-[#2E7D32] hover:bg-[#256628]"
                }`}
              >
                <ScanSearch className="h-5 w-5" strokeWidth={2} />
                {detecting ? "Detecting…" : "Detect Insects"}
              </button>
            )}

            {/* Error message */}
            <ErrorBanner message={error} />

            {/* 4. Result */}
            {result && <ResultSection result={result} />}
          </div>
        </div>

        <p className="mt-6 text-xs text-gray-400">
          Developed By Ambady S
        </p>
      </main>
    </div>
  );
}
