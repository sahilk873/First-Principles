'use client';
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from 'react';
import { clsx } from 'clsx';

interface ImagingViewerProps {
  imagingPaths: string[];
}

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tif', '.tiff'];

const getFileName = (path: string) => {
  const segments = path.split('/');
  return segments[segments.length - 1] || path;
};

const isImageFile = (path: string) => {
  const lower = path.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
};

const buildPublicUrl = (path: string, options?: { download?: boolean }) => {
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/imaging/${path}`;
  if (options?.download) {
    const separator = base.includes('?') ? '&' : '?';
    return `${base}${separator}download=1`;
  }
  return base;
};

export function ImagingViewer({ imagingPaths }: ImagingViewerProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(imagingPaths[0] || null);

  const selectedFile = useMemo(() => {
    if (!selectedPath) {
      return null;
    }
    const url = buildPublicUrl(selectedPath);
    return {
      path: selectedPath,
      url,
      name: getFileName(selectedPath),
      previewable: isImageFile(selectedPath),
      downloadUrl: buildPublicUrl(selectedPath, { download: true }),
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
            {selectedFile.previewable ? (
              <img
                src={selectedFile.url}
                alt={selectedFile.name}
                className="max-h-[520px] w-full object-contain bg-black/60"
                loading="lazy"
              />
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
                {selectedFile.previewable ? 'Inline preview' : 'Preview unavailable'}
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
          const previewUrl = isImageFile(path) ? buildPublicUrl(path) : null;

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
                  <p className="text-xs text-slate-500">{previewUrl ? 'Image file' : 'Download to view'}</p>
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
