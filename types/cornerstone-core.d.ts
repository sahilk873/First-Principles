declare module 'cornerstone-core' {
  interface Image {
    imageId: string;
    minPixelValue: number;
    maxPixelValue: number;
    slope: number;
    intercept: number;
    windowCenter: number;
    windowWidth: number;
    render: (canvas: HTMLCanvasElement) => void;
    getPixelData: () => Uint8Array | Uint16Array | Int16Array;
    rows: number;
    columns: number;
    height: number;
    width: number;
    sizeInBytes: number;
    color: boolean;
    columnPixelSpacing?: number;
    rowPixelSpacing?: number;
    invert: boolean;
    numComps: number;
  }

  interface EnabledElement {
    element: HTMLElement;
    image: Image;
    canvas: HTMLCanvasElement;
    viewport: Viewport;
    options: any;
  }

  interface Viewport {
    scale: number;
    translation: { x: number; y: number };
    voi: { windowWidth: number; windowCenter: number };
    invert: boolean;
    pixelReplication: boolean;
    rotation: number;
    hflip: boolean;
    vflip: boolean;
    modalityLUT: any;
    voiLUT: any;
    colormap: any;
    labelmap: boolean;
  }

  interface Cornerstone {
    enable(element: HTMLElement, canvas?: HTMLCanvasElement): void;
    disable(element: HTMLElement): void;
    getEnabledElement(element: HTMLElement): EnabledElement | undefined;
    loadImage(imageId: string, options?: any): Promise<Image>;
    displayImage(element: HTMLElement, image: Image, viewport?: Partial<Viewport>): void;
    resize(element: HTMLElement, force?: boolean): void;
    setViewport(element: HTMLElement, viewport: Partial<Viewport>): void;
    getViewport(element: HTMLElement): Viewport | undefined;
    getImage(element: HTMLElement): Image | undefined;
    reset(element: HTMLElement): void;
    updateImage(element: HTMLElement): void;
    drawImage(element: HTMLElement, invalidated?: boolean): void;
    draw(element: HTMLElement, invalidated?: boolean): void;
    invalidate(element: HTMLElement, invalidated?: boolean): void;
    getDefaultViewport(element: HTMLElement, image: Image): Viewport;
    getViewportForImage(element: HTMLElement, image: Image): Viewport;
    setToPixelCoordinateSystem(enabledElement: EnabledElement, context: CanvasRenderingContext2D): void;
    pageToPixel(element: HTMLElement, pageX: number, pageY: number): { x: number; y: number };
    pixelToCanvas(element: HTMLElement, pixel: { x: number; y: number }): { x: number; y: number };
    setCanvasSize(element: HTMLElement, width: number, height: number): void;
    getCanvas(element: HTMLElement): HTMLCanvasElement | undefined;
    getEnabledElements(): EnabledElement[];
    getStoredPixelData(image: Image): Uint8Array | Uint16Array | Int16Array;
    registerImageLoader(scheme: string, imageLoader: (imageId: string, options?: any) => Promise<Image>): void;
    registerImageLoaderPromise(scheme: string, imageLoader: (imageId: string, options?: any) => Promise<Image>): void;
    loadAndCacheImage(imageId: string, options?: any): Promise<Image>;
    loadImageFromPromise(imageId: string, imagePromise: Promise<Image>): Promise<Image>;
    registerWebImageLoader(scheme?: string): void;
    registerWebImageLoaderPromise(scheme?: string): void;
    registerUnknownImageLoader(scheme?: string): void;
    registerUnknownImageLoaderPromise(scheme?: string): void;
    unregisterImageLoader(scheme: string): void;
    imageCache: {
      getImageLoadObject(imageId: string): { promise: Promise<Image> } | undefined;
      putImageLoadObject(imageId: string, imageLoadObject: { promise: Promise<Image> }): void;
      removeImageLoadObject(imageId: string): void;
      getCacheInfo(): { cacheSizeInBytes: number; numberOfImagesCached: number };
      purgeCache(): void;
    };
    metaData: {
      addProvider(provider: (type: string, imageId: string) => any, priority?: number): void;
      removeProvider(provider: (type: string, imageId: string) => any): void;
      get(type: string, imageId: string): any;
    };
    webGL: {
      isWebGLEnabled(): boolean;
      getWebGLContext(canvas: HTMLCanvasElement): WebGLRenderingContext | null;
    };
    events: {
      addEventListener(type: string, callback: (event: any) => void): void;
      removeEventListener(type: string, callback: (event: any) => void): void;
      triggerEvent(element: HTMLElement, type: string, detail?: any): void;
    };
    init(): void;
    setUseSharedArrayBuffer(useSharedArrayBuffer: boolean): void;
    getUseSharedArrayBuffer(): boolean;
  }

  const cornerstone: Cornerstone;
  const moduleExports: Cornerstone & { default: Cornerstone; cornerstone: Cornerstone };
  export = moduleExports;
}
