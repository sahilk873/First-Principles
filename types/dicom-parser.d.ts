declare module 'dicom-parser' {
  interface DataSet {
    byteArray: Uint8Array;
    byteArrayParser: any;
    elements: { [tag: string]: DataElement };
    warnings: string[];
    littleEndian: boolean;
    position: number;
    string(tag: string): string | undefined;
    uint16(tag: string): number | undefined;
    int16(tag: string): number | undefined;
    uint32(tag: string): number | undefined;
    int32(tag: string): number | undefined;
    float(tag: string): number | undefined;
    double(tag: string): number | undefined;
    attributeTag(tag: string): string | undefined;
    text?(tag: string): string | undefined;
    byte(tag: string): number | undefined;
    element(tag: string): DataElement | undefined;
    findAndGetElement(tag: string): DataElement | undefined;
    findAndGetUint16(tag: string): number | undefined;
    findAndGetInt16(tag: string): number | undefined;
    findAndGetUint32(tag: string): number | undefined;
    findAndGetInt32(tag: string): number | undefined;
    findAndGetFloat(tag: string): number | undefined;
    findAndGetDouble(tag: string): number | undefined;
    findAndGetString(tag: string): string | undefined;
    findAndGetElementByTag(tag: string): DataElement | undefined;
    findAndGetSequenceItem(tag: string, item: number): DataSet | undefined;
    findAndGetSequenceItems(tag: string): DataSet[] | undefined;
  }

  interface DataElement {
    tag: string;
    vr: string;
    length: number;
    dataOffset: number;
    hasPixelData: boolean;
    encapsulatedPixelData?: boolean;
    basicOffsetTable?: number[];
    fragments?: number[];
    items?: DataSet[];
  }

  interface ParseOptions {
    untilTag?: string;
    vrCallback?: (tag: string, vr: string) => string;
    untilTagCallback?: (tag: string) => boolean;
  }

  function parseDicom(byteArray: Uint8Array, options?: ParseOptions): DataSet;

  interface DicomParserModule {
    parseDicom(byteArray: Uint8Array, options?: ParseOptions): DataSet;
    default?: DicomParserModule;
  }

  const moduleExports: DicomParserModule;
  export = moduleExports;
}
