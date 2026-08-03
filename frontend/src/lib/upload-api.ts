import { ApiError } from "@/lib/api";
import { getToken } from "@/lib/auth-storage";
import type { DocumentData, DocumentType } from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface QuickResult {
  document_type: DocumentType | "UNKNOWN";
  classification_confidence: number;
  data: DocumentData | null;
  raw_text: string;
}

export interface UploadResult {
  file_id: string;
  file_name: string;
  stored_at: string;
  destination: "databricks_volume" | "local_fallback";
  quick_result: QuickResult | null;
  quick_result_error: string | null;
}

/**
 * Real upload to the backend's /upload endpoint. Uses XMLHttpRequest
 * instead of fetch specifically because fetch has no upload-progress
 * event — XHR does (xhr.upload.onprogress), which is what drives the
 * real progress bar in the upload queue UI.
 */
export function uploadDocument(file: File, onProgress: (percent: number) => void): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}/upload`);

    const token = getToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let body: unknown = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // Non-JSON response body — status check below still handles it.
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as UploadResult);
        return;
      }

      const detail =
        body && typeof body === "object" && "detail" in body ? String((body as { detail: unknown }).detail) : null;
      reject(new ApiError(xhr.status, detail ?? xhr.statusText ?? "Upload failed"));
    };

    xhr.onerror = () => reject(new ApiError(0, "Could not reach the server. Is the backend running?"));

    const formData = new FormData();
    formData.append("file", file);
    xhr.send(formData);
  });
}
