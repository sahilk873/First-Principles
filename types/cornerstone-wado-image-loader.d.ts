declare module 'cornerstone-wado-image-loader' {
  interface External {
    cornerstone: any;
    dicomParser: any;
  }

  interface ConfigureOptions {
    useWebWorkers?: boolean;
    decodeConfig?: {
      usePDFJS?: boolean;
      useNativeJPEG2000?: boolean;
      useNativeJPEGBaseline?: boolean;
      useNativeJPEGLossless?: boolean;
      useNativeJPEGLS?: boolean;
      useNativeZIP?: boolean;
      useNativeMultiFrame?: boolean;
      maxWebWorkers?: number;
      startWebWorkersOnDemand?: boolean;
      webWorkerPath?: string;
      webWorkerTaskPaths?: string[];
      taskConfiguration?: any;
    };
  }

  interface WadoImageLoader {
    external: External;
    configure(options: ConfigureOptions): void;
  }

  const wadoImageLoader: WadoImageLoader;
  export default wadoImageLoader;
  export { wadoImageLoader, External, ConfigureOptions };
}

