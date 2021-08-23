interface MeshoptDecoder {
    ready: Promise<void>;
    supported: boolean;
}

declare global {
    const MeshoptDecoder: MeshoptDecoder;
}

export {};
