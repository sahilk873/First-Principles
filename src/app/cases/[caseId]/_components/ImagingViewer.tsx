'use client';
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from 'react';
import { clsx } from 'clsx';

interface ImagingViewerProps {
  imagingPaths: string[];
}

type FilePreviewType = 'image' | 'dicom' | 'other';

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tif', '.tiff'];
const DICOM_EXTENSIONS = ['.dcm', '.dicom'];

const getFileName = (path: string) => {
  const segments = path.split('/');
  return segments[segments.length - 1] || path;
};

const isImageFile = (path: string) => {
  const lower = path.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
};

const isDicomFile = (path: string) => {
  const lower = path.toLowerCase();
  return DICOM_EXTENSIONS.some((ext) => lower.endsWith(ext));
};

const getFileType = (path: string): FilePreviewType => {
  if (isDicomFile(path)) return 'dicom';
  if (isImageFile(path)) return 'image';
  return 'other';
};

const buildPublicUrl = (path: string, options?: { download?: boolean }) => {
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/imaging/${path}`;
  if (options?.download) {
    const separator = base.includes('?') ? '&' : '?';
    return `${base}${separator}download=1`;
  }
  return base;
};

type CornerstoneType = typeof import('cornerstone-core');
let cornerstoneInstance: CornerstoneType | null = null;
let cornerstoneInitPromise: Promise<CornerstoneType> | null = null;

const loadCornerstone = async (): Promise<CornerstoneType> => {
  if (!cornerstoneInitPromise) {
    cornerstoneInitPromise = (async () => {
      const [cornerstoneModule, wadoLoaderModule, dicomParserModule] = await Promise.all([
        import('cornerstone-core'),
        import('cornerstone-wado-image-loader'),
        import('dicom-parser'),
      ]);
      const cornerstone = (cornerstoneModule.default ?? cornerstoneModule) as CornerstoneType;
      const wadoLoader = wadoLoaderModule.default ?? wadoLoaderModule;
      const dicomParser = dicomParserModule.default ?? dicomParserModule;
      wadoLoader.external.cornerstone = cornerstone;
      wadoLoader.external.dicomParser = dicomParser;
      wadoLoader.configure({ useWebWorkers: false });
      cornerstoneInstance = cornerstone;
      return cornerstone;
    })();
  }

  if (!cornerstoneInstance) {
    cornerstoneInstance = await cornerstoneInitPromise;
  }

  return cornerstoneInstance;
};

export function ImagingViewer({ imagingPaths }: ImagingViewerProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(imagingPaths[0] || null);

  const selectedFile = useMemo(() => {
    if (!selectedPath) {
      return null;
    }
    const type = getFileType(selectedPath);
    const url = buildPublicUrl(selectedPath);
    return {
      path: selectedPath,
      url,
      downloadUrl: buildPublicUrl(selectedPath, { download: true }),
      name: getFileName(selectedPath),
      type,
    };
  }, [selectedPath]);

  if (!imagingPaths.length) {
    return null;
  }

  return (
    <div className="space-y-4">
      {selectedFile && (
        <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-900/5">
          <div className="flex items-center justify-center bg-slate-900/5 max-h-[540px] min-h-[320px]">
            {selectedFile.type === 'image' ? (
              <img
                src={selectedFile.url}
                alt={selectedFile.name}
                className="max-h-[520px] w-full object-contain bg-black/60"
                loading="lazy"
              />
            ) : selectedFile.type === 'dicom' ? (
              <DicomPreview imageUrl={selectedFile.url} fileName={selectedFile.name} />
            ) : (
              <div className="text-center text-sm text-slate-500 p-6">
                Preview not available. Use the download option below to view this file.
              </div>
            )}
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 py-3 bg-white border-t border-slate-200">
            <div>
              <p className="text-sm font-semibold text-slate-800">{selectedFile.name}</p>
              <p className="text-xs text-slate-500">
                {selectedFile.type === 'image'
                  ? 'Inline preview'
                  : selectedFile.type === 'dicom'
                  ? 'DICOM preview'
                  : 'Preview unavailable'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <a
                href={selectedFile.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Open in new tab
              </a>
              <a
                href={selectedFile.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {imagingPaths.map((path) => {
          const fileName = getFileName(path);
          const isActive = path === selectedPath;
          const fileType = getFileType(path);
          const previewUrl = fileType === 'image' ? buildPublicUrl(path) : null;

          return (
            <button
              type="button"
              key={path}
              onClick={() => setSelectedPath(path)}
              className={clsx(
                'w-full flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-all',
                isActive
                  ? 'border-blue-200 bg-blue-50/60 shadow-sm'
                  : 'border-slate-200 hover:border-blue-200 hover:bg-blue-50/40'
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center">
                  {previewUrl ? (
                    <img src={previewUrl} alt={fileName} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{fileName}</p>
                  <p className="text-xs text-slate-500">
                    {fileType === 'image'
                      ? 'Image file'
                      : fileType === 'dicom'
                      ? 'DICOM file'
                      : 'Download to view'}
                  </p>
                </div>
              </div>
              <svg
                className={clsx('w-4 h-4 text-slate-400 transition-transform', isActive && 'text-blue-500 rotate-90')}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface DicomPreviewProps {
  imageUrl: string;
  fileName: string;
}

function DicomPreview({ imageUrl, fileName }: DicomPreviewProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let mounted = true;
    const element = canvasRef.current;
    if (!element) {
      return () => undefined;
    }

    setError(null);
    setIsLoading(true);

    loadCornerstone()
      .then((cornerstone) => {
        if (!mounted || !element) return;
        cornerstone.enable(element);
        return cornerstone
          .loadImage(`wadouri:${imageUrl}`)
          .then((image) => {
            if (!mounted) return;
            cornerstone.displayImage(element, image);
            setIsLoading(false);
          })
          .catch((err) => {
            console.error('Failed to load DICOM image', err);
            if (!mounted) return;
            setError('Unable to render this DICOM file. Use Download to open it in a dedicated viewer.');
            setIsLoading(false);
          });
      })
      .catch((err) => {
        console.error('Failed to initialize DICOM viewer', err);
        if (!mounted) return;
        setError('Unable to initialize DICOM viewer.');
        setIsLoading(false);
      });

    return () => {
      mounted = false;
      if (element && cornerstoneInstance) {
        try {
          cornerstoneInstance.disable(element);
        } catch (err) {
          console.warn('Error cleaning up DICOM viewer', err);
        }
      }
    };
  }, [imageUrl]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-4">
      <div
        ref={canvasRef}
        className="w-full h-[480px] bg-black/80 rounded-lg overflow-hidden"
        aria-label={`DICOM preview for ${fileName}`}
      />
      {isLoading && <p className="mt-2 text-xs text-slate-400">Loading DICOM image...</p>}
      {error && <p className="mt-2 text-xs text-rose-400 text-center max-w-sm">{error}</p>}
    </div>
  );
}
