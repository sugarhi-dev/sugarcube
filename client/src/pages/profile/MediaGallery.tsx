import { LinkOutlined, PictureOutlined, UploadOutlined } from '@ant-design/icons';
import type { UserMedia } from '@sugarcube/schema';
import { Button } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { PhotoLightbox } from './PhotoLightbox.tsx';
import { MediaTile } from './MediaTile.tsx';
import { profileMediaItemPath } from './paths.ts';

export function MediaGallery({
    readOnly,
    media,
    removingId,
    onEdit,
    onRemove,
    onUpload,
    onAddPhoto,
    onAddLink,
}: {
    readOnly: boolean;
    media: UserMedia[];
    removingId: string | null;
    onEdit: (item: UserMedia) => void;
    onRemove: (id: string) => void;
    onUpload: () => void;
    onAddPhoto: () => void;
    onAddLink: () => void;
}) {
    const navigate = useNavigate();
    const [enlargedPhotoId, setEnlargedPhotoId] = useState<string | null>(null);
    const enlarged = media.find((item) => item.id === enlargedPhotoId) ?? null;
    const mosaic = media.slice(0, 5);
    const overflow = media.length > mosaic.length;
    const first = media[0];

    return (
        <>
            {readOnly ? null : (
                <div className="review-media-actions">
                    <Button htmlType="button" className="media-upload" icon={<UploadOutlined />} onClick={onUpload}>
                        Upload
                    </Button>
                    <Button htmlType="button" className="media-upload" icon={<PictureOutlined />} onClick={onAddPhoto}>
                        Photo
                    </Button>
                    <Button htmlType="button" className="media-add" icon={<LinkOutlined />} onClick={onAddLink}>
                        YouTube / Vimeo
                    </Button>
                </div>
            )}
            {media.length > 0 ? (
                <div className="review-media-wrap">
                    <div className="crew-media">
                        {mosaic.map((item, index) => (
                            <MediaTile
                                key={item.id}
                                item={item}
                                index={index}
                                total={media.length}
                                readOnly={readOnly}
                                removing={removingId === item.id}
                                showAll={overflow && index === mosaic.length - 1}
                                onShowAll={() => {
                                    if (first) {
                                        navigate(profileMediaItemPath(first.id));
                                    }
                                }}
                                onOpenPhoto={() => setEnlargedPhotoId(item.id)}
                                onEdit={() => onEdit(item)}
                                onRemove={() => onRemove(item.id)}
                            />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="crew-media-empty">No media yet</div>
            )}
            <PhotoLightbox
                open={enlargedPhotoId !== null}
                src={enlarged?.image_url ?? null}
                onClose={() => setEnlargedPhotoId(null)}
            />
        </>
    );
}
