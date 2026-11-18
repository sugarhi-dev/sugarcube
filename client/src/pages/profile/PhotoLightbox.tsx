import { Modal, Spin } from 'antd';
import { useEffect, useState } from 'react';
import { getMediaThumbnail } from '../../api/media.ts';

export function PhotoLightbox({
    accessToken,
    id,
    path,
    onClose,
    fullscreen = false,
}: {
    accessToken: string;
    id: string | null;
    path: string | null;
    onClose: () => void;
    fullscreen?: boolean;
}) {
    const [src, setSrc] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!id || !path) {
            setSrc(null);
            setFailed(false);
            return;
        }

        let active = true;
        let url: string | null = null;
        setSrc(null);
        setFailed(false);
        void getMediaThumbnail(accessToken, id, path).then((blob) => {
            if (!active) {
                return;
            }
            url = URL.createObjectURL(blob);
            setSrc(url);
        }).catch(() => {
            if (active) {
                setFailed(true);
            }
        });

        return () => {
            active = false;
            if (url) {
                URL.revokeObjectURL(url);
            }
        };
    }, [accessToken, id, path]);

    return (
        <Modal
            open={id !== null}
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
            {src ? (
                <img src={src} alt="" />
            ) : failed ? (
                <p className="photo-lightbox-status">Could not load that photo.</p>
            ) : (
                <Spin />
            )}
        </Modal>
    );
}
