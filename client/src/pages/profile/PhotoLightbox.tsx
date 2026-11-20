import { Modal } from 'antd';
import { useEffect, useState } from 'react';

export function PhotoLightbox({
    open,
    src,
    onClose,
    fullscreen = false,
}: {
    open: boolean;
    src: string | null;
    onClose: () => void;
    fullscreen?: boolean;
}) {
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setFailed(false);
    }, [src]);

    return (
        <Modal
            open={open}
            title="Photo"
            footer={null}
            centered={!fullscreen}
            destroyOnHidden
            width={fullscreen ? '100vw' : 'min(960px, calc(100vw - 48px))'}
            style={fullscreen ? { top: 0, height: '100vh', maxWidth: '100vw', margin: 0, paddingBottom: 0 } : undefined}
            classNames={{
                wrapper: fullscreen ? 'photo-lightbox-wrap is-fullscreen' : undefined,
                container: fullscreen ? 'photo-lightbox-panel is-fullscreen' : 'photo-lightbox-panel',
                body: fullscreen ? 'photo-lightbox-body is-fullscreen' : 'photo-lightbox-body',
            }}
            styles={fullscreen ? { wrapper: { padding: 0 } } : undefined}
            onCancel={onClose}
        >
            {src && !failed ? (
                <img src={src} alt="" onError={() => setFailed(true)} />
            ) : (
                <p className="photo-lightbox-status">Could not load that photo.</p>
            )}
        </Modal>
    );
}
