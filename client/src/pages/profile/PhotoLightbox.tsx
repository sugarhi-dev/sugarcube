import { Modal, Spin } from 'antd';
import { useEffect, useState } from 'react';
import { getMediaThumbnail } from '../../api/media.ts';

export function PhotoLightbox({
    accessToken,
    id,
    path,
    onClose,
}: {
    accessToken: string;
    id: string | null;
    path: string | null;
    onClose: () => void;
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
            centered
            destroyOnHidden
            width="min(960px, calc(100vw - 48px))"
            classNames={{
                container: 'photo-lightbox-panel',
                body: 'photo-lightbox-body',
            }}
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
