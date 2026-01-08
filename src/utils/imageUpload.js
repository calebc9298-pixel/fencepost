import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  uploadString,
  getDownloadURL,
} from 'firebase/storage';
import { storage } from '../config/firebase';
import { auth } from '../config/firebase';

const CLIENT_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
// Videos are larger; keep a reasonable cap aligned with `storage.rules`.
const CLIENT_MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const CLIENT_MAX_DIMENSION = 1600;
const CLIENT_IMAGE_QUALITY = 0.75;

const nowMs = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

// Spec-required gating (safe on native where `localStorage` is undefined).
const DEBUG =
  typeof localStorage !== 'undefined' &&
  localStorage.getItem('FP_UPLOAD_DEBUG') === '1';

const getUploadStallMs = () => {
  // Default 20s; configurable on web via localStorage.
  if (typeof localStorage !== 'undefined') {
    const raw = localStorage.getItem('FP_UPLOAD_STALL_MS');
    const n = raw ? Number(raw) : NaN;
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 20000;
};

const VERY_HIGH_UPLOAD_TIMEOUT_MS = 30 * 60 * 1000;

const uploadLog = (...args) => {
  if (!DEBUG) return;
  // Keep logs very compact; this is for diagnosing timeouts.
  console.log('[upload]', ...args);
};

const withTimeout = (promise, ms, { onTimeout, timeoutMessage } = {}) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      try {
        onTimeout?.();
      } catch {
        // ignore
      }
      reject(new Error(timeoutMessage || 'Uploader: operation timed out'));
    }, ms);
  });

  return Promise.race([
    promise.finally(() => clearTimeout(timeoutId)),
    timeoutPromise,
  ]);
};

const fetchBlobWithTimeout = async (uri, ms) => {
  // Web: keep reads snappy; avoid hanging fetch(uri).blob() paths.
  const effectiveMs =
    typeof ms === 'number' && ms > 0 ? ms : isWeb() ? 10000 : 60000;

  // AbortController is supported on web; on native it may be undefined.
  const controller =
    typeof AbortController !== 'undefined' ? new AbortController() : null;
  const t0 = nowMs();
  uploadLog('read:start', {
    uri: typeof uri === 'string' ? uri.slice(0, 120) : typeof uri,
    ms: effectiveMs,
  });

  const fetchPromise = fetch(
    uri,
    controller ? { signal: controller.signal } : undefined
  );
  const response = await withTimeout(fetchPromise, effectiveMs, {
    onTimeout: () => controller?.abort(),
    timeoutMessage: 'Uploader: image read timed out',
  });

  const status = response?.status ?? null;
  const ok = Boolean(response?.ok);
  const headerContentType =
    typeof response?.headers?.get === 'function'
      ? response.headers.get('content-type')
      : null;

  if (!ok) {
    if (isWeb()) {
      uploadLog('read:web', {
        status,
        ok,
        contentType: headerContentType,
        blobSize: null,
      });
    }
    throw new Error(`Uploader: failed to read image (${status ?? 'unknown'}).`);
  }

  const blob = await response.blob();
  const blobSize = typeof blob?.size === 'number' ? blob.size : null;
  const blobType = blob?.type ?? null;

  if (isWeb()) {
    uploadLog('read:web', {
      status,
      ok,
      contentType: headerContentType,
      blobType,
      blobSize,
    });
  }

  if (!blob || typeof blob.size !== 'number' || blob.size <= 0) {
    uploadLog('read:done', {
      elapsedMs: Math.round(nowMs() - t0),
      size: blobSize,
      type: blobType,
    });
    throw new Error('Uploader: read returned empty blob (0 bytes).');
  }

  uploadLog('read:done', {
    elapsedMs: Math.round(nowMs() - t0),
    size: blobSize,
    type: blobType,
  });
  return blob;
};

const bytesToMb = bytes => Math.round((bytes / (1024 * 1024)) * 10) / 10;

const dataUrlSizeBytes = dataUrl => {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return null;
  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex === -1) return null;
  const header = dataUrl.slice(0, commaIndex);
  const data = dataUrl.slice(commaIndex + 1);
  const isBase64 = /;base64$/i.test(header);

  if (isBase64) {
    const cleaned = data.replace(/\s/g, '');
    const padding = cleaned.endsWith('==') ? 2 : cleaned.endsWith('=') ? 1 : 0;
    const bytes = Math.floor((cleaned.length * 3) / 4) - padding;
    return Number.isFinite(bytes) && bytes >= 0 ? bytes : null;
  }

  try {
    return new Blob([decodeURIComponent(data)]).size;
  } catch {
    return null;
  }
};

const maxBytesForFolder = folder => {
  // Keep in sync with `storage.rules`.
  if (String(folder).startsWith('profiles')) return 5 * 1024 * 1024;
  return 50 * 1024 * 1024;
};

const isWeb = () => typeof document !== 'undefined';

const dataUrlToBlobWeb = dataUrl => {
  if (!isWeb())
    throw new Error('Uploader: data URL conversion only supported on web');
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    throw new Error('Uploader: invalid data URL');
  }

  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex === -1) throw new Error('Uploader: invalid data URL');

  const header = dataUrl.slice(0, commaIndex);
  const data = dataUrl.slice(commaIndex + 1);
  const m = header.match(/^data:([^;]+)?(;base64)?$/i);
  const contentType = m?.[1] || 'application/octet-stream';
  const isBase64 = Boolean(m?.[2]);

  if (isBase64) {
    if (typeof atob !== 'function')
      throw new Error('Uploader: base64 decode not supported');
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: contentType });
  }

  // Non-base64 data URLs are percent-encoded.
  const text = decodeURIComponent(data);
  return new Blob([text], { type: contentType });
};

const getStorageBucketName = () => {
  // Prefer the configured bucket; fallback to the storage instance.
  return storage?.app?.options?.storageBucket || storage?._bucket || null;
};

const uploadViaFirebaseRestWeb = async ({ objectPath, blob, contentType }) => {
  if (!isWeb()) throw new Error('Uploader: REST upload only supported on web');
  const bucket = getStorageBucketName();
  if (!bucket) throw new Error('Uploader: missing storage bucket');

  const user = auth?.currentUser;
  if (!user) throw new Error('Uploader: not signed in');

  const idToken = await user.getIdToken();
  // Firebase Storage REST API: upload object bytes with Firebase Auth token.
  // NOTE: uploadType=media is required for raw bytes uploads.
  const url = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o?uploadType=media&name=${encodeURIComponent(objectPath)}`;

  const downloadToken = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const res = await withTimeout(
    fetch(url, {
      method: 'POST',
      headers: {
        // Firebase Storage expects the Firebase ID token in this format.
        Authorization: `Firebase ${idToken}`,
        'Content-Type': contentType || 'application/octet-stream',
        // Set a download token so we can build a public download URL if needed.
        'X-Goog-Meta-firebaseStorageDownloadTokens': downloadToken,
      },
      body: blob,
    }),
    240000,
    { timeoutMessage: 'Uploader: REST upload request timed out' }
  );

  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `Uploader: REST upload failed (${res.status}) ${text.slice(0, 300)}`
    );
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  return {
    bucket,
    objectPath,
    downloadTokens: json?.downloadTokens || null,
    downloadToken,
  };
};

const downscaleImageBlobWeb = async (
  blob,
  { maxDim = 1600, quality = 0.75 } = {}
) => {
  if (!isWeb()) return blob;
  if (!blob || typeof blob.size !== 'number') return blob;
  try {
    let width = 0;
    let height = 0;
    let draw = null;

    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(blob);
      width = bitmap.width || 0;
      height = bitmap.height || 0;
      draw = (ctx, targetW, targetH) => {
        ctx.drawImage(bitmap, 0, 0, targetW, targetH);
        try {
          bitmap.close?.();
        } catch {
          // ignore
        }
      };
    } else {
      const url = URL.createObjectURL(blob);
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error('Failed to decode image'));
        i.src = url;
      }).finally(() => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      });

      width = img.naturalWidth || img.width || 0;
      height = img.naturalHeight || img.height || 0;
      draw = (ctx, targetW, targetH) => {
        ctx.drawImage(img, 0, 0, targetW, targetH);
      };
    }

    const maxSide = Math.max(width, height);
    if (!maxSide || maxSide <= maxDim) return blob;

    const scale = maxDim / maxSide;
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return blob;

    draw?.(ctx, targetW, targetH);

    const out = await new Promise((resolve, reject) => {
      canvas.toBlob(
        b => (b ? resolve(b) : reject(new Error('Failed to compress image'))),
        'image/jpeg',
        quality
      );
    });

    return out;
  } catch {
    return blob;
  }
};

const getImageSizeNative = async uri => {
  const rn = await import('react-native');
  const Image = rn?.Image;
  if (!Image?.getSize) return null;

  return new Promise(resolve => {
    try {
      Image.getSize(
        uri,
        (width, height) => resolve({ width, height }),
        () => resolve(null)
      );
    } catch {
      resolve(null);
    }
  });
};

const downscaleImageNativeIfNeeded = async (
  sourceUri,
  { maxDim = 1600, quality = 0.75 } = {}
) => {
  if (isWeb()) return null;
  if (typeof sourceUri !== 'string' || !sourceUri) return null;

  const ImageManipulator = await import('expo-image-manipulator');
  if (typeof ImageManipulator?.manipulateAsync !== 'function') return null;

  const size = await getImageSizeNative(sourceUri);
  const width = size?.width || 0;
  const height = size?.height || 0;
  const maxSide = Math.max(width, height);

  const actions = [];
  if (maxSide && maxSide > maxDim) {
    if (width >= height) actions.push({ resize: { width: maxDim } });
    else actions.push({ resize: { height: maxDim } });
  }

  const result = await ImageManipulator.manipulateAsync(sourceUri, actions, {
    compress: quality,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  if (!result?.uri) return null;
  return {
    uri: result.uri,
    didResize: actions.length > 0,
    original: { width, height },
  };
};

const coerceBlobToFileWeb = (blob, { name, type } = {}) => {
  if (!isWeb()) return blob;
  if (typeof File === 'undefined') return blob;
  if (blob instanceof File) return blob;
  if (!(blob instanceof Blob)) return blob;

  const safeName =
    typeof name === 'string' && name.trim() ? name.trim() : 'image';
  const safeType =
    typeof type === 'string' && type
      ? type
      : blob.type || 'application/octet-stream';
  try {
    return new File([blob], safeName, { type: safeType });
  } catch {
    return blob;
  }
};

const waitForUpload = (
  uploadTask,
  { stallMs = 20000, hardMs = null, onProgress } = {}
) =>
  new Promise((resolve, reject) => {
    let stallTimer;
    let hardTimer;
    let lastTransferred = 0;
    const t0 = nowMs();
    let lastProgressAt = t0;

    const cleanup = () => {
      if (stallTimer) clearTimeout(stallTimer);
      if (hardTimer) clearTimeout(hardTimer);
    };

    const snapshotInfo = () => {
      const snap = uploadTask?.snapshot;
      const bt = snap?.bytesTransferred ?? 0;
      const tt = snap?.totalBytes ?? 0;
      return `${bt}/${tt}`;
    };

    const startStallTimer = () => {
      if (stallTimer) clearTimeout(stallTimer);
      stallTimer = setTimeout(() => {
        try {
          uploadTask?.cancel?.();
        } catch {
          // ignore
        }
        const elapsedSinceProgressMs = Math.round(nowMs() - lastProgressAt);
        uploadLog('stall detected after X ms with last bytesTransferred = Y', {
          stallMs,
          elapsedSinceProgressMs,
          lastBytesTransferred: lastTransferred,
        });
        cleanup();
        reject(
          new Error(`Uploader: resumable upload stalled (${snapshotInfo()})`)
        );
      }, stallMs);
    };

    if (typeof hardMs === 'number' && hardMs > 0) {
      hardTimer = setTimeout(() => {
        try {
          uploadTask?.cancel?.();
        } catch {
          // ignore
        }
        cleanup();
        reject(
          new Error(`Uploader: resumable upload timed out (${snapshotInfo()})`)
        );
      }, hardMs);
    }

    startStallTimer();

    uploadTask.on(
      'state_changed',
      snap => {
        const bt = snap?.bytesTransferred ?? 0;
        const tt = snap?.totalBytes ?? 0;
        const pct = tt ? Math.floor((bt / tt) * 100) : 0;
        uploadLog('progress', {
          bytesTransferred: bt,
          totalBytes: tt,
          pct,
          state: snap?.state,
        });
        try {
          onProgress?.({
            bytesTransferred: bt,
            totalBytes: tt,
            state: snap?.state,
            ms: Math.round(nowMs() - t0),
          });
        } catch {
          // ignore
        }
        if (bt !== lastTransferred) {
          lastTransferred = bt;
          lastProgressAt = nowMs();
          startStallTimer();
        }
      },
      error => {
        cleanup();
        reject(error);
      },
      () => {
        cleanup();
        resolve(uploadTask.snapshot.ref);
      }
    );
  });

const inferContentType = ({ sourceUri, blobLike }) => {
  const blobType = blobLike?.type;
  if (
    typeof blobType === 'string' &&
    (blobType.startsWith('image/') || blobType.startsWith('video/'))
  )
    return blobType;

  const uri = typeof sourceUri === 'string' ? sourceUri : '';
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.heic') || lower.endsWith('.heif')) return 'image/heic';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';

  if (lower.endsWith('.mp4') || lower.endsWith('.m4v')) return 'video/mp4';
  if (lower.endsWith('.mov')) return 'video/quicktime';
  if (lower.endsWith('.webm')) return 'video/webm';

  // Many blob/data URLs don't preserve mime type; default to jpeg.
  return 'image/jpeg';
};

const extForContentType = contentType => {
  switch (contentType) {
    case 'video/mp4':
      return 'mp4';
    case 'video/quicktime':
      return 'mov';
    case 'video/webm':
      return 'webm';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    case 'image/heic':
      return 'heic';
    case 'image/jpeg':
    default:
      return 'jpg';
  }
};

const isVideoContentType = ct =>
  typeof ct === 'string' && ct.startsWith('video/');
const isImageContentType = ct =>
  typeof ct === 'string' && ct.startsWith('image/');

/**
 * Upload media (image/video) to Firebase Storage
 * @param {string|Blob|File|{uri:string}} uri - Local URI (or Blob/File)
 * @param {string} folder - Folder path in storage (e.g., 'posts', 'profiles')
 * @returns {Promise<string>} - Download URL of uploaded media
 */
export const uploadImage = async (uri, folder = 'posts') => {
  let overallT0 = null;
  let attemptT0 = null;
  let attemptElapsedMs = null;
  let diagnostics = null;

  try {
    overallT0 = nowMs();
    diagnostics = {
      method: 'unknown',
      folder: String(folder),
      bucket: getStorageBucketName() || null,
      objectPath: null,
      contentType: null,
      size: null,
    };

    uploadLog('start', {
      folder: String(folder),
      platform: typeof document !== 'undefined' ? 'web' : 'native',
      uriType: typeof uri,
      isDataUrl: typeof uri === 'string' ? uri.startsWith('data:') : false,
    });

    const isStringUri = typeof uri === 'string';
    const isDataUrl = isStringUri && uri.startsWith('data:');
    const maybeUri =
      !isStringUri &&
      uri &&
      typeof uri === 'object' &&
      typeof uri.uri === 'string'
        ? uri.uri
        : null;
    const isBlobLike =
      !isStringUri &&
      !maybeUri &&
      uri &&
      typeof Blob !== 'undefined' &&
      uri instanceof Blob;

    const inputFileName =
      isWeb() && typeof File !== 'undefined' && uri instanceof File
        ? uri.name || null
        : null;

    const blobSource = (() => {
      if (isDataUrl) return { kind: 'dataUrl', preview: uri.slice(0, 80) };
      if (isStringUri) return { kind: 'stringUri', uri: uri.slice(0, 200) };
      if (typeof maybeUri === 'string' && maybeUri)
        return { kind: 'objectUri', uri: maybeUri.slice(0, 200) };
      if (isBlobLike)
        return {
          kind: 'blobLike',
          ctor: uri?.constructor?.name || null,
          type: uri?.type ?? null,
        };
      return { kind: typeof uri, ctor: uri?.constructor?.name || null };
    })();

    // Web must always use resumable uploads; convert data URLs into a Blob so we can uploadBytesResumable.
    // Native can still use uploadString(data_url) for data URLs.
    const blobLike = isDataUrl
      ? isWeb()
        ? dataUrlToBlobWeb(uri)
        : null
      : isStringUri
        ? await fetchBlobWithTimeout(uri)
        : maybeUri
          ? await fetchBlobWithTimeout(maybeUri)
          : isBlobLike
            ? uri
            : uri;

    if (!isDataUrl && !blobLike) {
      throw new Error('No image data to upload.');
    }

    const ruleMaxBytes = maxBytesForFolder(folder);
    const originalSize = !isDataUrl
      ? typeof blobLike?.size === 'number'
        ? blobLike.size
        : null
      : dataUrlSizeBytes(uri);
    diagnostics.size = typeof originalSize === 'number' ? originalSize : null;

    // Web requires a real Blob/File (with known non-zero size) for resumable uploads.
    if (isWeb() && !isDataUrl) {
      if (typeof originalSize !== 'number' || originalSize <= 0) {
        throw new Error(
          'Uploader: invalid web image data (missing/empty Blob/File). Please re-select the image.'
        );
      }
    }

    const sourceUri = isStringUri ? uri : maybeUri;
    const inferredTypeForLimits = isDataUrl
      ? typeof uri === 'string'
        ? uri.slice(0, uri.indexOf(','))
        : null
      : inferContentType({ sourceUri, blobLike });

    const isProfiles = String(folder).startsWith('profiles');
    const clientMaxBytes = isVideoContentType(inferredTypeForLimits)
      ? CLIENT_MAX_VIDEO_BYTES
      : CLIENT_MAX_IMAGE_BYTES;

    uploadLog('input', {
      originalSize,
      originalMb:
        typeof originalSize === 'number' ? bytesToMb(originalSize) : null,
      clientMaxBytes,
      clientMaxMb: bytesToMb(clientMaxBytes),
      ruleMaxBytes,
      ruleMaxMb: bytesToMb(ruleMaxBytes),
      blobType: !isDataUrl ? (blobLike?.type ?? null) : null,
      inferredType: inferredTypeForLimits || null,
    });

    if (typeof originalSize === 'number' && originalSize > clientMaxBytes) {
      uploadLog('reject:size', {
        size: originalSize,
        sizeMb: bytesToMb(originalSize),
        maxBytes: clientMaxBytes,
        maxMb: bytesToMb(clientMaxBytes),
        folder: String(folder),
      });
      const label = isVideoContentType(inferredTypeForLimits)
        ? 'Video'
        : 'Image';
      const maxLabel = isVideoContentType(inferredTypeForLimits)
        ? `${bytesToMb(CLIENT_MAX_VIDEO_BYTES)}MB`
        : '5MB';
      throw new Error(
        `${label} too large (${bytesToMb(originalSize)}MB). Max allowed is ${maxLabel}.`
      );
    }

    let contentType = inferContentType({ sourceUri, blobLike });
    let normalizedBlob = blobLike;
    diagnostics.contentType = contentType;

    // Enforce type constraints before we do any work.
    if (isProfiles) {
      if (!isImageContentType(contentType)) {
        throw new Error('Profile uploads must be an image.');
      }
    } else {
      if (
        !isImageContentType(contentType) &&
        !isVideoContentType(contentType)
      ) {
        throw new Error('Please select an image or video file.');
      }
    }

    if (isDataUrl) {
      // data:[<mime>][;base64],<data>
      const header = uri.slice(0, uri.indexOf(','));
      const m = header.match(/^data:([^;]+)(;base64)?$/i);
      if (m?.[1]) contentType = m[1];

      uploadLog('sizes', {
        originalSize,
        finalSize: originalSize,
        originalMb:
          typeof originalSize === 'number' ? bytesToMb(originalSize) : null,
        finalMb:
          typeof originalSize === 'number' ? bytesToMb(originalSize) : null,
      });
    }

    if (!isDataUrl) {
      const beforeSize =
        typeof blobLike?.size === 'number' ? blobLike.size : null;

      if (isImageContentType(contentType)) {
        if (isWeb()) {
          const downscaled = await downscaleImageBlobWeb(blobLike, {
            maxDim: CLIENT_MAX_DIMENSION,
            quality: CLIENT_IMAGE_QUALITY,
          });
          if (downscaled !== blobLike) {
            normalizedBlob = downscaled;
            contentType = 'image/jpeg';
          }
        } else if (typeof sourceUri === 'string' && sourceUri) {
          try {
            const manipulated = await downscaleImageNativeIfNeeded(sourceUri, {
              maxDim: CLIENT_MAX_DIMENSION,
              quality: CLIENT_IMAGE_QUALITY,
            });
            if (manipulated?.uri) {
              const blob2 = await fetchBlobWithTimeout(manipulated.uri, 60000);
              normalizedBlob = blob2;
              contentType = 'image/jpeg';
              uploadLog('downscale', {
                platform: 'native',
                didResize: manipulated.didResize,
                originalDims: manipulated.original,
              });
            }
          } catch (e) {
            uploadLog('downscale:skip', {
              platform: 'native',
              reason: String(e?.message || 'unknown'),
            });
          }
        }
      }

      // Ensure we pass a File object into uploadBytesResumable on web.
      if (isWeb()) {
        normalizedBlob = coerceBlobToFileWeb(normalizedBlob, {
          name: inputFileName,
          type: contentType,
        });
      }

      const afterSize =
        typeof normalizedBlob?.size === 'number' ? normalizedBlob.size : null;
      uploadLog('sizes', {
        originalSize: beforeSize,
        finalSize: afterSize,
        originalMb:
          typeof beforeSize === 'number' ? bytesToMb(beforeSize) : null,
        finalMb: typeof afterSize === 'number' ? bytesToMb(afterSize) : null,
      });

      if (typeof afterSize === 'number' && afterSize > clientMaxBytes) {
        uploadLog('reject:size', {
          size: afterSize,
          sizeMb: bytesToMb(afterSize),
          maxBytes: clientMaxBytes,
          maxMb: bytesToMb(clientMaxBytes),
          folder: String(folder),
          phase: 'after-transform',
        });
        const label = isVideoContentType(contentType) ? 'Video' : 'Image';
        const maxLabel = isVideoContentType(contentType)
          ? `${bytesToMb(CLIENT_MAX_VIDEO_BYTES)}MB`
          : '5MB';
        throw new Error(
          `${label} too large after processing (${bytesToMb(afterSize)}MB). Max allowed is ${maxLabel}.`
        );
      }
    }

    const ext = extForContentType(contentType);

    // Create unique filename
    const filename = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    diagnostics.objectPath = filename;
    const storageRef = ref(storage, filename);

    uploadLog('object', {
      objectPath: filename,
      contentType,
      size: diagnostics.size,
    });

    const attemptDataUrl = async () => {
      diagnostics.method = 'sdk:uploadString(data_url)';
      attemptT0 = nowMs();
      uploadLog('attempt:start', {
        method: diagnostics.method,
        objectPath: filename,
      });
      const snap = await withTimeout(
        uploadString(storageRef, uri, 'data_url', { contentType }),
        VERY_HIGH_UPLOAD_TIMEOUT_MS,
        { timeoutMessage: 'Uploader: upload request timed out' }
      );
      attemptElapsedMs = Math.round(nowMs() - attemptT0);
      return snap.ref;
    };

    const attemptResumable = async () => {
      diagnostics.method = 'sdk:uploadBytesResumable';
      attemptT0 = nowMs();

      if (isWeb()) {
        const isBlob =
          typeof Blob !== 'undefined' && normalizedBlob instanceof Blob;
        const size = normalizedBlob?.size;
        const mime = normalizedBlob?.type;
        uploadLog('preflight', {
          source: blobSource,
          ctor: normalizedBlob?.constructor?.name || null,
          isBlob,
          size,
          mime: typeof mime === 'string' ? mime : null,
        });

        if (!isBlob) {
          throw new Error(
            `Invalid web upload object (expected Blob/File, got ${normalizedBlob?.constructor?.name || typeof normalizedBlob})`
          );
        }
        if (typeof size !== 'number' || size <= 0) {
          throw new Error('Invalid upload blob/file (size 0)');
        }
      }

      uploadLog('attempt:start', {
        method: diagnostics.method,
        objectPath: filename,
      });
      const uploadTask = uploadBytesResumable(storageRef, normalizedBlob, {
        contentType,
      });
      const refOut = await waitForUpload(uploadTask, {
        stallMs: getUploadStallMs(),
        hardMs: null,
      });
      attemptElapsedMs = Math.round(nowMs() - attemptT0);
      return refOut;
    };

    const attemptNonResumable = async () => {
      diagnostics.method = 'sdk:uploadBytes';
      attemptT0 = nowMs();
      uploadLog('attempt:start', {
        method: diagnostics.method,
        objectPath: filename,
      });
      // `uploadBytes` is often more reliable on web for very small files.
      const snap = await withTimeout(
        uploadBytes(storageRef, normalizedBlob, { contentType }),
        VERY_HIGH_UPLOAD_TIMEOUT_MS,
        { timeoutMessage: 'Uploader: upload request timed out' }
      );
      attemptElapsedMs = Math.round(nowMs() - attemptT0);
      return snap.ref;
    };

    const attemptRest = async () => {
      diagnostics.method = 'rest:firebasestorage.googleapis.com';
      attemptT0 = nowMs();
      uploadLog('attempt:start', {
        method: diagnostics.method,
        objectPath: filename,
      });
      const rest = await uploadViaFirebaseRestWeb({
        objectPath: filename,
        blob: normalizedBlob,
        contentType,
      });
      attemptElapsedMs = Math.round(nowMs() - attemptT0);

      // Try SDK getDownloadURL first.
      try {
        const downloadURL = await getDownloadURL(ref(storage, rest.objectPath));
        uploadLog('attempt:done', {
          method: diagnostics.method,
          bucket: rest.bucket,
          objectPath: rest.objectPath,
          downloadURL,
          elapsedMs: attemptElapsedMs,
        });
        uploadLog('overall:elapsedMs', Math.round(nowMs() - overallT0));
        return { downloadURL };
      } catch {
        const token = String(
          rest.downloadTokens || rest.downloadToken || ''
        ).split(',')[0];
        if (token) {
          const encodedPath = encodeURIComponent(rest.objectPath);
          const downloadURL = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(rest.bucket)}/o/${encodedPath}?alt=media&token=${encodeURIComponent(token)}`;
          uploadLog('attempt:done', {
            method: diagnostics.method,
            bucket: rest.bucket,
            objectPath: rest.objectPath,
            downloadURL,
            elapsedMs: attemptElapsedMs,
          });
          uploadLog('overall:elapsedMs', Math.round(nowMs() - overallT0));
          return {
            downloadURL: `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(rest.bucket)}/o/${encodedPath}?alt=media&token=${encodeURIComponent(token)}`,
          };
        }
      }

      throw new Error(
        'Uploader: REST upload completed but no download URL/token was returned'
      );
    };

    let uploadedRef;

    // WEB: always use resumable and never fall back automatically.
    if (isWeb()) {
      try {
        uploadedRef = await attemptResumable();
      } catch (e) {
        const code = e?.code ? String(e.code) : null;
        const message = e?.message ? String(e.message) : 'Upload failed';
        const stack = e?.stack ? String(e.stack) : null;
        uploadLog('attempt:error', {
          code,
          message,
          method: 'sdk:uploadBytesResumable',
          bucket: diagnostics?.bucket,
          objectPath: diagnostics?.objectPath,
          stack: stack ? stack.slice(0, 900) : null,
        });
        uploadLog('overall:elapsedMs', Math.round(nowMs() - overallT0));
        throw e;
      }
    } else if (isDataUrl) {
      // Native: data URLs can use uploadString.
      uploadedRef = await attemptDataUrl();
    } else {
      // Native: try resumable; keep the existing fallback behavior.
      try {
        uploadedRef = await attemptResumable();
      } catch (e) {
        const msg = String(e?.message || '');
        const stalledAtZero =
          msg.includes('resumable upload stalled') && msg.includes('(0/');
        if (stalledAtZero) {
          uploadedRef = await attemptNonResumable();
        } else {
          throw e;
        }
      }
    }

    // Get download URL
    const downloadURL = await getDownloadURL(uploadedRef);
    uploadLog('attempt:done', {
      method: diagnostics.method,
      bucket: diagnostics.bucket,
      objectPath: diagnostics.objectPath,
      downloadURL,
      elapsedMs: attemptElapsedMs,
    });
    uploadLog('overall:elapsedMs', Math.round(nowMs() - overallT0));
    return downloadURL;
  } catch (error) {
    const code = error?.code ? String(error.code) : null;
    const message = error?.message ? String(error.message) : 'Upload failed';
    const stack = error?.stack ? String(error.stack) : null;
    uploadLog('attempt:error', {
      code,
      message,
      method: diagnostics?.method,
      bucket: diagnostics?.bucket,
      objectPath: diagnostics?.objectPath,
      stack: stack ? stack.slice(0, 900) : null,
    });
    try {
      uploadLog(
        'overall:elapsedMs',
        Math.round(
          nowMs() - (typeof overallT0 === 'number' ? overallT0 : nowMs())
        )
      );
    } catch {
      // ignore
    }
    console.error('Error uploading image:', { code, message, error });
    // Throw a clean error message so callers can show it.
    throw new Error(code ? `${message} (${code})` : message);
  }
};

/**
 * Upload multiple images to Firebase Storage
 * @param {Array<string>} uris - Array of local image URIs
 * @param {string} folder - Folder path in storage
 * @returns {Promise<Array<string>>} - Array of download URLs
 */
export const uploadMultipleImages = async (uris, folder = 'posts') => {
  try {
    const downloadURLs = [];
    for (const uri of uris) {
      // Sequential uploads reduce the chance of the browser getting stuck.
      // Also makes timeouts and retries more predictable.
      // eslint-disable-next-line no-await-in-loop
      const url = await uploadImage(uri, folder);
      downloadURLs.push(url);
    }
    return downloadURLs;
  } catch (error) {
    console.error('Error uploading multiple images:', error);
    throw error;
  }
};

/**
 * Web-only diagnostic helper (behind FP_UPLOAD_DEBUG=1).
 * Uploads a 1KB text blob to Storage to validate connectivity.
 */
export const debugStorageUploadWeb = async () => {
  const debugEnabled =
    typeof localStorage !== 'undefined' &&
    localStorage.getItem('FP_UPLOAD_DEBUG') === '1';
  if (!debugEnabled) return null;
  if (!isWeb()) return null;

  const debugLog = (...args) => {
    if (!debugEnabled) return;
    console.log('[upload]', ...args);
  };

  // Keep this within the allowed write rules (see storage.rules).
  // Rules currently allow authenticated writes only to /posts/{imageId} and only for image/*.
  const tinyPngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wIAAgMBApGxq6QAAAAASUVORK5CYII=';
  const bytes =
    typeof atob === 'function'
      ? Uint8Array.from(atob(tinyPngBase64), c => c.charCodeAt(0))
      : new Uint8Array([]);
  const blob = new Blob([bytes], { type: 'image/png' });
  const path = `posts/debug-${Date.now()}.png`;

  debugLog('debug:start', {
    size: blob.size,
    type: blob.type,
    path,
  });

  try {
    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, blob, {
      contentType: blob.type,
    });

    const uploadedRef = await waitForUpload(task, {
      stallMs: getUploadStallMs(),
      hardMs: null,
      onProgress: ({ bytesTransferred, totalBytes }) => {
        debugLog('debug:progress', { bytesTransferred, totalBytes });
      },
    });

    const downloadURL = await getDownloadURL(uploadedRef);
    debugLog('debug:done', { downloadURL });
    return downloadURL;
  } catch (e) {
    debugLog('debug:error', {
      code: e?.code ? String(e.code) : null,
      message: e?.message ? String(e.message) : 'Upload failed',
    });
    throw e;
  }
};

// Expose for quick testing from the web DevTools console.
if (isWeb() && typeof window !== 'undefined') {
  window.FP_debugStorageUpload = debugStorageUploadWeb;
}
