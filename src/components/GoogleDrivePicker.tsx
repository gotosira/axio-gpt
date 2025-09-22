'use client';

import { useEffect, useRef, useState } from 'react';

interface DriveFileLike {
  id: string;
  name: string;
  mimeType: string;
  url?: string;
  iconUrl?: string;
  sizeBytes?: number;
  lastEditedUtc?: string;
  serviceId?: string;
  downloadUrl?: string;
  file?: File;
}

interface GoogleDrivePickerProps {
  onFileSelect: (files: DriveFileLike[]) => void;
  onClose: () => void;
}

interface GooglePicker {
  PickerBuilder: new () => {
    addView: (viewId: any) => any;
    setOAuthToken: (token: string) => any;
    setOrigin: (origin: string) => any;
    setDeveloperKey: (apiKey: string) => any;
    setAppId?: (appId: string) => any;
    setSize: (width: number, height: number) => any;
    setTitle: (title: string) => any;
    setCallback: (callback: (data: any) => void) => any;
    build: () => any;
  };
  picker: {
    PickerBuilder: new () => any;
    DocsView: new (viewId: any) => any;
    ViewId: any;
    Feature: any;
    Response: any;
    Action: any;
    ViewGroup: any;
  };
  accounts: {
    oauth2: {
      initTokenClient: (config: any) => any;
    };
  };
}

interface Gapi {
  load: (api: string, config: { callback?: () => void; onerror?: (error: unknown) => void }) => void;
}

declare global {
  interface Window {
    google: GooglePicker;
    gapi: Gapi;
  }
}

// Shared helper: request a Drive access token
const obtainAccessToken = async (): Promise<string | null> => {
  try {
    const existing = localStorage.getItem('google_access_token');
    if (existing) return existing;
  } catch {}

  // Try server-issued token first (no user prompt)
  try {
    const resp = await fetch('/api/google/token', { cache: 'no-store' });
    if (resp.ok) {
      const data = await resp.json() as { accessToken?: string };
      if (data.accessToken) {
        try { localStorage.setItem('google_access_token', data.accessToken); } catch {}
        return data.accessToken;
      }
    }
  } catch {}

  // Fallback to GIS prompt
  return new Promise((resolve) => {
    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      resolve(null);
      return;
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      callback: (response: { access_token?: string }) => {
        if (response.access_token) {
          try { localStorage.setItem('google_access_token', response.access_token); } catch {}
          resolve(response.access_token);
        } else {
          resolve(null);
        }
      },
      error_callback: () => resolve(null),
    });
    client.requestAccessToken();
  });
};

export function GoogleDrivePicker({ onFileSelect, onClose }: GoogleDrivePickerProps) {
  const pickerRef = useRef<{ setVisible: (visible: boolean) => void } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const accessTokenRef = useRef<string | null>(null);
  const hasInitializedRef = useRef<boolean>(false);
  const hasClosedRef = useRef<boolean>(false);
  const [useNativeBrowser] = useState<boolean>(true); // Prefer native browser to avoid ad/content blockers
  const [nativeFiles, setNativeFiles] = useState<Array<{ id: string; name: string; mimeType: string; sizeBytes?: number; iconUrl?: string; webViewLink?: string; modifiedTime?: string; parents?: string[]; thumbnailLink?: string }>>([]);
  const [nativeSelected, setNativeSelected] = useState<Record<string, boolean>>({});
  const [nativeQuery, setNativeQuery] = useState<string>("");
  const nextPageTokenRef = useRef<string | null>(null);
  const [sortKey, setSortKey] = useState<'modifiedTime' | 'name' | 'size' | 'type'>('modifiedTime');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [preview, setPreview] = useState<{ id: string; name: string; mimeType: string; url?: string } | null>(null);
  const [viewMode, setViewMode] = useState<'grid'|'list'>('grid');
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id: string; name: string }>>([{ id: 'root', name: 'My Drive' }]);

  useEffect(() => {
    const initializePicker = async () => {
      if (hasInitializedRef.current) return;
      hasInitializedRef.current = true;
      try {
        console.log('Initializing Google Drive Picker...');
        setIsLoading(true);
        setError(null);
        
        // If using native Drive browser, skip Google Picker entirely
        if (useNativeBrowser) {
          const token = await ensureAccessToken();
          if (!token) throw new Error('No Google access token');
          await openNativeDriveBrowser();
          setIsLoading(false);
          return;
        }

        console.log('Google API not loaded, attempting to load...');
        // Try to load Google API with a simpler approach
        const loaded = await loadGoogleAPISimple();
        if (!loaded) {
          console.log('Google API could not be loaded in time. Falling back to manual picker.');
          setIsLoading(false);
          triggerManualFallback();
          return;
        }
        
        console.log('Google API loaded successfully, creating picker...');
        // Ensure we have a token (prefer stored before prompting)
        let token: string | null = null;
        try { token = localStorage.getItem('google_access_token'); } catch {}
        if (!token) token = await obtainAccessToken();
        if (!token) {
          console.warn('Failed to obtain Google access token, using manual fallback');
          setIsLoading(false);
          triggerManualFallback();
          return;
        }
        accessTokenRef.current = token;
        // Create the picker
        await createPicker();
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing Google Drive Picker:', error);
        setIsLoading(false);
        if (useNativeBrowser) {
          // Ensure at least manual file input
          triggerManualFallback();
        } else {
          triggerManualFallback();
        }
      }
    };

    const loadGoogleAPISimple = async (): Promise<boolean> => {
      return new Promise((resolve) => {
        // Check if Google API is already loaded
        if (window.google && window.google.picker) {
          console.log('Google API already loaded');
          resolve(true);
          return;
        }

        // Check if script already exists
        const existingScript = document.querySelector('script[src="https://apis.google.com/js/api.js"]');
        if (existingScript) {
          console.log('Script exists, initializing picker module via gapi.load...');

          // Wait for gapi, then explicitly load the picker module
          let waitedMs = 0;
          const gapiWaitInterval = setInterval(() => {
            waitedMs += 100;
            if (window.gapi) {
              clearInterval(gapiWaitInterval);
              window.gapi.load('picker', {
                callback: () => {
            if (window.google && window.google.picker) {
                    console.log('Picker module initialized from existing script');
                    resolve(true);
                  } else {
                    console.warn('Picker module callback fired but window.google.picker missing');
                    resolve(false);
                  }
                },
                onerror: (err: unknown) => {
                  console.error('gapi.load("picker") failed:', err);
                  resolve(false);
                }
              });
            } else if (waitedMs >= 12000) {
              clearInterval(gapiWaitInterval);
              console.warn('Timed out waiting for gapi when script already present');
              resolve(false);
            }
          }, 100);
          return;
        }

        console.log('Loading Google API script...');
        // Load Google API script with simpler approach
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.async = true;
        script.defer = true;
        script.crossOrigin = 'anonymous';
        
        script.onload = () => {
          console.log('Google API script loaded successfully');
          
          // Wait for gapi to be available with shorter timeout
      let gapiTimeout: ReturnType<typeof setTimeout>;
          const waitForGapi = () => {
            if (window.gapi) {
              console.log('gapi available, loading picker...');
              window.gapi.load('picker', {
                callback: () => {
                  console.log('Picker loaded, checking google.picker...');
                  if (window.google && window.google.picker) {
                    console.log('Google Picker API ready');
                    clearTimeout(gapiTimeout);
                    resolve(true);
                  } else {
                    console.error('Google Picker API not available after loading');
                    clearTimeout(gapiTimeout);
                    resolve(false);
                  }
                },
                onerror: (error: unknown) => {
                  console.error('Failed to load Google Picker API:', error);
                  clearTimeout(gapiTimeout);
                  resolve(false);
                }
              });
            } else {
              console.log('Waiting for gapi to be available...');
              setTimeout(waitForGapi, 100);
            }
          };
          
          // Set timeout for gapi loading
          gapiTimeout = setTimeout(() => {
            console.log('gapi loading timeout, using fallback');
            resolve(false);
          }, 12000);
          
          // Start waiting for gapi with delay
          setTimeout(waitForGapi, 500);
        };
        
        script.onerror = (error: unknown) => {
          console.error('Failed to load Google API script:', error);
          resolve(false);
        };
        
        document.head.appendChild(script);
        
        // Overall timeout guard
        setTimeout(() => {
          console.log('Overall Google API loading timeout, using fallback');
          resolve(false);
        }, 15000);
      });
    };

    const createPicker = async () => {
      if (pickerRef.current) {
        // Already built, just show it
        try { pickerRef.current.setVisible(true); } catch {}
        return;
      }
      // Get or refresh token via GIS
      let accessToken = accessTokenRef.current || null;
      if (!accessToken) {
        try { accessToken = localStorage.getItem('google_access_token'); } catch {}
      }
      if (!accessToken) {
        accessToken = await obtainAccessToken();
      }
      if (!accessToken) throw new Error('No Google access token available.');

      // Verify Google Picker is available
      if (!window.google || !window.google.picker || !window.google.picker.PickerBuilder) {
        throw new Error('Google Picker API is not properly loaded');
      }

      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
      if (!apiKey) {
        console.warn('Missing NEXT_PUBLIC_GOOGLE_API_KEY. Google Picker requires an API key.');
      }

      // Initialize the picker with ChatGPT-like modal configuration
      // Build a Docs view (official sample pattern)
      const docsView = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS)
        .setIncludeFolders(true)
        .setSelectFolderEnabled(true);

      const builder = new window.google.picker.PickerBuilder()
        .addView(docsView)
        .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
        .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
        .setOAuthToken(accessToken)
        .setOrigin(window.location.origin)
        .setDeveloperKey(apiKey || '')
        .setSize(1051, 650) // ChatGPT-like size
        .setTitle('Select a file') // ChatGPT-like title
        .setCallback((data: { action: string; docs?: any[] }) => {
          try {
          if (data.action === window.google.picker.Action.PICKED) {
              const documents = (data as any)[window.google.picker.Response.DOCUMENTS] || data.docs || [];
              const files = documents.map((doc: any) => ({
              id: doc.id,
                name: doc.name || doc["name"],
                mimeType: doc.mimeType || doc["mimeType"],
                url: doc.url || doc["url"],
                iconUrl: doc.iconUrl || doc["iconUrl"],
                sizeBytes: doc.sizeBytes || doc["sizeBytes"],
                lastEditedUtc: doc.lastEditedUtc || doc["lastEditedUtc"],
                serviceId: doc.serviceId || doc["serviceId"],
                downloadUrl: doc.downloadUrl || doc["downloadUrl"] || doc.url,
            }));
            onFileSelect(files);
            }
          } finally {
            if (!hasClosedRef.current) {
              hasClosedRef.current = true;
              try { pickerRef.current?.setVisible(false); } catch {}
              onClose();
            }
          }
        });

      // Optionally set App ID if provided (helps with Drive file attribution)
      const appId = process.env.NEXT_PUBLIC_GOOGLE_APP_ID;
      if (appId && typeof (builder as any).setAppId === 'function') {
        (builder as any).setAppId(appId);
      }

      const picker = builder.build();

      pickerRef.current = picker;
      picker.setVisible(true);
    };

    const ensureAccessToken = async (): Promise<string | null> => {
      if (accessTokenRef.current) return accessTokenRef.current;
      let token: string | null = null;
      try { token = localStorage.getItem('google_access_token'); } catch {}
      if (!token) token = await obtainAccessToken();
      if (token) accessTokenRef.current = token;
      return token;
    };

    const openNativeDriveBrowser = async () => {
      const token = await ensureAccessToken();
      if (!token) throw new Error('No Google access token');
      await loadDriveFiles('');
    };

    const loadDriveFiles = async (q: string, pageToken?: string | null) => {
      const token = await ensureAccessToken();
      if (!token) return;
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          pageSize: '50',
          fields: 'files(id,name,mimeType,iconLink,webViewLink,size,modifiedTime,parents,thumbnailLink),nextPageToken',
          q: `${currentFolderId ? `'${currentFolderId}' in parents and trashed=false` : 'trashed=false'}${q ? ` and name contains '${q.replace(/'/g, "\\'")}'` : ''}`,
          orderBy: sortKey === 'name' ? `name ${sortDir}` : sortKey === 'type' ? `mimeType ${sortDir}` : `modifiedTime ${sortDir}`,
          spaces: 'drive',
        });
        if (pageToken) params.set('pageToken', pageToken);
        const resp = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) throw new Error('Failed listing Drive files');
        const data = await resp.json() as { files: Array<{ id: string; name: string; mimeType: string; iconLink?: string; webViewLink?: string; size?: string; modifiedTime?: string; parents?: string[]; thumbnailLink?: string }>; nextPageToken?: string };
        setNativeFiles((prev) => (pageToken ? [...prev, ...data.files.map(f => ({ id: f.id, name: f.name, mimeType: f.mimeType, iconUrl: f.iconLink, webViewLink: f.webViewLink, sizeBytes: f.size ? Number(f.size) : undefined, modifiedTime: f.modifiedTime, parents: f.parents, thumbnailLink: f.thumbnailLink }))] : data.files.map(f => ({ id: f.id, name: f.name, mimeType: f.mimeType, iconUrl: f.iconLink, webViewLink: f.webViewLink, sizeBytes: f.size ? Number(f.size) : undefined, modifiedTime: f.modifiedTime, parents: f.parents, thumbnailLink: f.thumbnailLink }))));
        nextPageTokenRef.current = data.nextPageToken || null;
      } finally {
        setIsLoading(false);
      }
    };

    // expose helpers to UI handlers above without causing closure type issues
    (window as unknown as { __loadDriveFiles: (q: string) => Promise<void>; __loadDriveFilesNext: () => Promise<void> }).__loadDriveFiles = async (q: string) => {
      await loadDriveFiles(q);
    };
    (window as unknown as { __loadDriveFiles: (q: string) => Promise<void>; __loadDriveFilesNext: () => Promise<void> }).__loadDriveFilesNext = async () => {
      await loadDriveFiles(nativeQuery, nextPageTokenRef.current);
    };

    const triggerManualFallback = () => {
      try {
        console.log('Triggering manual file input fallback');
        setError('Google Drive Picker ไม่สามารถโหลดได้');
        setTimeout(() => {
          const manualFileInput = document.createElement('input');
          manualFileInput.type = 'file';
          manualFileInput.multiple = true;
          manualFileInput.accept = '.pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.mp4,.mp3,.wav,.webm,.ogg';
          manualFileInput.style.display = 'none';
          manualFileInput.onchange = (event: any) => {
            const files = Array.from(event.target.files || []) as File[];
            if (files.length > 0) {
              const driveFiles = files.map((file: File) => ({
                id: `manual-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
                name: file.name,
                mimeType: file.type,
                url: URL.createObjectURL(file),
                iconUrl: '',
                sizeBytes: file.size,
                lastEditedUtc: new Date().toISOString(),
                serviceId: 'manual-upload',
                file,
              }));
              onFileSelect(driveFiles);
            }
            onClose();
          };
          document.body.appendChild(manualFileInput);
          manualFileInput.click();
          setTimeout(() => document.body.removeChild(manualFileInput), 1000);
        }, 500);
      } catch (e) {
        console.error('Manual fallback failed:', e);
      }
    };

    initializePicker();

    return () => {
      if (pickerRef.current) {
        try { pickerRef.current.setVisible(false); } catch {}
        pickerRef.current = null;
      }
      hasInitializedRef.current = false;
      hasClosedRef.current = false;
    };
  }, [onFileSelect, onClose]);

  // Function to get access token from Google OAuth
  // (Component no longer defines its own token getter; use obtainAccessToken)

  // Function to authenticate with Google for fallback
  const authenticateWithGoogle = async (): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!window.google) {
        console.error('Google API not loaded for authentication');
        resolve(null);
        return;
      }

      window.google.accounts.oauth2.initTokenClient({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        callback: (response: { access_token?: string }) => {
          if (response.access_token) {
            localStorage.setItem('google_access_token', response.access_token);
            resolve(response.access_token);
          } else {
            console.error('Failed to get access token:', response);
            resolve(null);
          }
        },
        error_callback: (error: unknown) => {
          console.error('OAuth error:', error);
          resolve(null);
        }
      }).requestAccessToken();
    });
  };

  // Show loading indicator while Google API is loading
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <div className="text-gray-700">กำลังโหลด Google Drive Picker...</div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
          <div className="text-center mb-4">
            <div className="text-red-600 mb-2 flex items-center justify-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
            <div className="text-gray-600 text-sm">
              กำลังเปิดหน้าต่างเลือกไฟล์จากเครื่องแทน...
            </div>
          </div>
          <div className="flex space-x-2 justify-center">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
            >
              ปิด
            </button>
            <button
              onClick={() => {
                setError(null);
                setIsLoading(true);
                // Restart the initialization process
                window.location.reload();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              ลองใหม่
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Native Drive browser UI (ad-blocker friendly)
  if (useNativeBrowser) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative z-10 bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[80vh] flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center gap-3">
            <input
              className="flex-1 border rounded px-3 py-2 text-sm"
              placeholder="Search Drive (press Enter)"
              value={nativeQuery}
              onChange={(e) => setNativeQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setNativeFiles([]);
                  nextPageTokenRef.current = null;
                  // eslint-disable-next-line @typescript-eslint/no-floating-promises
                  (async () => { await (window as unknown as { __loadDriveFiles: (q: string) => Promise<void> }).__loadDriveFiles(nativeQuery); })();
                }
              }}
            />
            <button
              className="px-3 py-2 text-sm border rounded"
              onClick={() => { setNativeFiles([]); nextPageTokenRef.current = null; /* eslint-disable-next-line @typescript-eslint/no-floating-promises */ (async () => { await (window as unknown as { __loadDriveFiles: (q: string) => Promise<void> }).__loadDriveFiles(nativeQuery); })(); }}
            >Search</button>
            <div className="ml-auto flex items-center gap-2 text-sm">
              <span className="text-gray-500">Sort</span>
              <select aria-label="Sort by" className="border rounded px-2 py-1" value={sortKey} onChange={(e)=>{setNativeFiles([]); nextPageTokenRef.current=null; setSortKey(e.target.value as any); /* eslint-disable-next-line @typescript-eslint/no-floating-promises */ (async()=>{await (window as unknown as { __loadDriveFiles: (q:string)=>Promise<void> }).__loadDriveFiles(nativeQuery);})();}}>
                <option value="modifiedTime">Last modified</option>
                <option value="name">Name</option>
                <option value="size">Size</option>
                <option value="type">Type</option>
              </select>
              <button className="border rounded px-2 py-1" onClick={()=>{setNativeFiles([]); nextPageTokenRef.current=null; setSortDir(sortDir==='asc'?'desc':'asc'); /* eslint-disable-next-line @typescript-eslint/no-floating-promises */ (async()=>{await (window as unknown as { __loadDriveFiles: (q:string)=>Promise<void> }).__loadDriveFiles(nativeQuery);})();}}>
                {sortDir==='asc'?'↑':'↓'}
              </button>
              <button className={`border rounded px-2 py-1 ${viewMode==='grid'?'bg-gray-100':''}`} onClick={()=>setViewMode('grid')} aria-label="Grid view">▦</button>
              <button className={`border rounded px-2 py-1 ${viewMode==='list'?'bg-gray-100':''}`} onClick={()=>setViewMode('list')} aria-label="List view">≣</button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex">
            {/* Sidebar tree */}
            <div className="w-56 border-r h-full overflow-y-auto p-3 text-sm">
              <div className="font-medium mb-2">Folders</div>
              <div className="space-y-1">
                {/* Breadcrumbs */}
                <div className="mb-2 text-xs text-gray-500">
                  {breadcrumbs.map((b, idx) => (
                    <span key={b.id}>
                      <button className={`underline ${idx===breadcrumbs.length-1?'text-gray-900':'text-blue-600'}`} onClick={()=>{setCurrentFolderId(b.id); setBreadcrumbs(breadcrumbs.slice(0, idx+1)); setNativeFiles([]); nextPageTokenRef.current=null; /* eslint-disable-next-line @typescript-eslint/no-floating-promises */ (async()=>{await (window as unknown as { __loadDriveFiles: (q:string)=>Promise<void> }).__loadDriveFiles(nativeQuery);})();}}>{b.name}</button>
                      {idx<breadcrumbs.length-1?' / ':''}
                    </span>
                  ))}
                </div>
                {nativeFiles.filter(f=>f.mimeType==='application/vnd.google-apps.folder').map(f=> (
                  <button key={f.id} className={`w-full text-left px-2 py-1 rounded hover:bg-gray-100 ${currentFolderId===f.id?'bg-gray-100':''}`} onClick={()=>{setCurrentFolderId(f.id); setBreadcrumbs([...breadcrumbs, { id: f.id, name: f.name }]); setNativeFiles([]); nextPageTokenRef.current=null; /* eslint-disable-next-line @typescript-eslint/no-floating-promises */ (async()=>{await (window as unknown as { __loadDriveFiles: (q:string)=>Promise<void> }).__loadDriveFiles('');})();}}>
                    📁 {f.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Main list */}
            <div className="flex-1 overflow-y-auto p-4">
            {nativeFiles.length === 0 ? (
              <div className="text-center text-gray-500 text-sm">No files. Try searching or check your Google Drive.</div>
            ) : (
              <div className={viewMode==='grid'?"grid grid-cols-1 sm:grid-cols-2 gap-3":"flex flex-col gap-2"}>
                {nativeFiles.filter(f=>f.mimeType!=='application/vnd.google-apps.folder').map((f) => (
                  <div key={f.id} className={`border rounded-lg p-3 hover:bg-gray-50 ${viewMode==='grid'?'flex items-start gap-3':'grid grid-cols-12 items-center gap-2'}`}>
                    <input
                      type="checkbox"
                      className="mt-1"
                      aria-label={`Select ${f.name}`}
                      checked={!!nativeSelected[f.id]}
                      onChange={(e) => setNativeSelected((prev) => ({ ...prev, [f.id]: e.target.checked }))}
                    />
                    <div className="w-16 h-12 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                      {f.thumbnailLink ? (
                        <img src={`${f.thumbnailLink}`} alt="thumb" className="w-full h-full object-cover" />
                      ) : f.iconUrl ? (
                        <img src={f.iconUrl} alt="icon" className="w-6 h-6" />
                      ) : (
                        <span className="text-xs text-gray-500">{f.mimeType.split('/')[1]||'file'}</span>
                      )}
                    </div>
                    <div className={`${viewMode==='grid'?'flex-1':'col-span-10'} min-w-0 cursor-pointer`} onClick={()=>setPreview({ id: f.id, name: f.name, mimeType: f.mimeType, url: f.webViewLink })}>
                      <div className="font-medium text-sm truncate" title={f.name}>{f.name}</div>
                      <div className="text-xs text-gray-500 truncate">{f.mimeType}{f.sizeBytes ? ` • ${(f.sizeBytes/1024).toFixed(1)} KB` : ''}{f.modifiedTime?` • ${new Date(f.modifiedTime).toLocaleString()}`:''}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {nextPageTokenRef.current && (
              <div className="mt-4 flex justify-center">
                <button className="px-4 py-2 text-sm border rounded" onClick={() => (window as unknown as { __loadDriveFilesNext: () => Promise<void> }).__loadDriveFilesNext()} title="Load more files" aria-label="Load more files">
                  Load more
                </button>
              </div>
            )}
            </div>

            {/* Preview pane */}
            <div className="w-80 border-l h-full overflow-y-auto p-4 hidden md:block">
              <div className="text-sm font-medium mb-2">Preview</div>
              {!preview ? (
                <div className="text-xs text-gray-500">Select a file to preview</div>
              ) : (
                <DrivePreview file={preview} />
              )}
            </div>
          </div>

          <div className="px-4 py-3 border-t flex items-center justify-end gap-2">
            <button className="px-4 py-2 text-sm border rounded" onClick={onClose}>Cancel</button>
            <button
              className="px-4 py-2 text-sm rounded text-white bg-[#074E9F]"
              onClick={() => {
                const selected = nativeFiles.filter(f => nativeSelected[f.id]);
                if (selected.length > 0) onFileSelect(selected.map(f => ({ id: f.id, name: f.name, mimeType: f.mimeType, webViewLink: f.webViewLink || '' })));
                onClose();
              }}
              disabled={Object.keys(nativeSelected).filter(id => nativeSelected[id]).length === 0}
            >Select</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// Hook to handle Google Drive authentication
export const useGoogleDriveAuth = () => {
  const authenticate = async (): Promise<string | null> => obtainAccessToken();
  return { authenticate };
};

// Simple preview component for right pane
const DrivePreview = ({ file }: { file: { id: string; name: string; mimeType: string; url?: string } }) => {
  const isImage = file.mimeType?.startsWith('image/');
  const isPdf = file.mimeType === 'application/pdf';
  return (
    <div className="space-y-2">
      <div className="font-medium text-sm truncate" title={file.name}>{file.name}</div>
      {isImage && file.url ? (
        <img src={file.url} alt={file.name} className="w-full h-auto rounded" />
      ) : isPdf && file.url ? (
        <iframe src={`https://drive.google.com/file/d/${file.id}/preview`} className="w-full h-64 border rounded" title="PDF preview" />
      ) : (
        <div className="text-xs text-gray-500">No inline preview available for this type. Use “Open in Drive”.</div>
      )}
      {file.url && (
        <a href={file.url} target="_blank" rel="noreferrer" className="inline-block text-xs text-blue-600 underline">Open in Drive</a>
      )}
    </div>
  );
};