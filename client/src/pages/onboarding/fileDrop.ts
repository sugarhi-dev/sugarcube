import { useEffect, type DragEvent as ReactDragEvent } from 'react';

type DropTarget = HTMLElement;

export function useKeepFileDrop(active: boolean): void {
    useEffect(() => {
        if (!active) {
            return;
        }

        function keep(event: DragEvent): void {
            if (!isFileDrag(event.dataTransfer)) {
                return;
            }
            event.preventDefault();
        }

        window.addEventListener('dragover', keep);
        window.addEventListener('drop', keep);
        return () => {
            window.removeEventListener('dragover', keep);
            window.removeEventListener('drop', keep);
        };
    }, [active]);
}

export function fileDropHandlers(
    onActive: () => void,
    onInactive: () => void,
    accept: (file: File) => void,
): {
    onDragEnter: (event: ReactDragEvent<DropTarget>) => void;
    onDragOver: (event: ReactDragEvent<DropTarget>) => void;
    onDragLeave: (event: ReactDragEvent<DropTarget>) => void;
    onDrop: (event: ReactDragEvent<DropTarget>) => void;
} {
    function blocked(event: ReactDragEvent<DropTarget>): boolean {
        return event.currentTarget instanceof HTMLButtonElement && event.currentTarget.disabled;
    }

    return {
        onDragEnter(event) {
            if (blocked(event) || !isFileDrag(event.dataTransfer)) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            onActive();
        },
        onDragOver(event) {
            if (!isFileDrag(event.dataTransfer)) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            event.dataTransfer.dropEffect = blocked(event) ? 'none' : 'copy';
            if (!blocked(event)) {
                onActive();
            }
        },
        onDragLeave(event) {
            const next = event.relatedTarget;
            if (next instanceof Node && event.currentTarget.contains(next)) {
                return;
            }
            onInactive();
        },
        onDrop(event) {
            event.preventDefault();
            event.stopPropagation();
            onInactive();
            if (blocked(event)) {
                return;
            }
            const file = event.dataTransfer.files[0];
            if (file) {
                accept(file);
            }
        },
    };
}

export function isFileDrag(data: DataTransfer | null): boolean {
    const types = data?.types;
    if (!types) {
        return false;
    }
    for (const type of types) {
        if (type === 'Files') {
            return true;
        }
    }
    return false;
}

export function fileDragKind(data: DataTransfer): 'video' | 'image' | null {
    const type = (data.items[0]?.type ?? '').toLowerCase();
    if (type === 'image/jpeg' || type === 'image/jpg' || type === 'image/png') {
        return 'image';
    }
    if (type.startsWith('video/')) {
        return 'video';
    }
    return null;
}

export function imageFile(file: File): File | null {
    const type = imageContentType(file);
    if (!type) {
        return null;
    }
    if (file.type === type) {
        return file;
    }
    return new File([file], file.name, { type, lastModified: file.lastModified });
}

function imageContentType(file: File): 'image/jpeg' | 'image/png' | null {
    const type = file.type.toLowerCase();
    if (type === 'image/jpeg' || type === 'image/jpg') {
        return 'image/jpeg';
    }
    if (type === 'image/png') {
        return 'image/png';
    }
    if (type && type !== 'application/octet-stream') {
        return null;
    }
    const name = file.name.toLowerCase();
    if (name.endsWith('.jpg') || name.endsWith('.jpeg')) {
        return 'image/jpeg';
    }
    if (name.endsWith('.png')) {
        return 'image/png';
    }
    return null;
}
