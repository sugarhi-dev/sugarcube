import { LinkOutlined, PictureOutlined, UploadOutlined } from '@ant-design/icons';
import type { UserMedia } from '@sugarcube/schema';
import { Button } from 'antd';
import { useState } from 'react';
import { PhotoLightbox } from './PhotoLightbox.tsx';
import { MediaTile } from './MediaTile.tsx';

export function MediaGallery({
    readOnly,
    media,
    accessToken,
    removingId,
    onEdit,
    onRemove,
    onUpload,
    onAddPhoto,
    onAddLink,
}: {
    readOnly: boolean;
    media: UserMedia[];
    accessToken: string;
    removingId: string | null;
    onEdit: (item: UserMedia) => void;
    onRemove: (id: string) => void;
    onUpload: () => void;
    onAddPhoto: () => void;
    onAddLink: () => void;
}) {
    const [enlargedPhotoId, setEnlargedPhotoId] = useState<string | null>(null);
    const mosaic = media.slice(0, 5);
    const more = media.slice(5);

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
                                accessToken={accessToken}
                                readOnly={readOnly}
                                removing={removingId === item.id}
                                onOpenPhoto={() => setEnlargedPhotoId(item.id)}
                                onEdit={() => onEdit(item)}
                                onRemove={() => onRemove(item.id)}
                            />
                        ))}
                    </div>
                    {more.length > 0 ? (
                        <div className="crew-media-more">
                            {more.map((item, index) => (
                                <MediaTile
                                    key={item.id}
                                    item={item}
                                    index={index + mosaic.length}
                                    total={media.length}
                                    accessToken={accessToken}
                                    readOnly={readOnly}
                                    removing={removingId === item.id}
                                    onOpenPhoto={() => setEnlargedPhotoId(item.id)}
                                    onEdit={() => onEdit(item)}
                                    onRemove={() => onRemove(item.id)}
                                />
                            ))}
                        </div>
                    ) : null}
                </div>
            ) : (
                <div className="crew-media-empty">No media yet</div>
            )}
            <PhotoLightbox
                accessToken={accessToken}
                id={enlargedPhotoId}
                path={enlargedPhotoId ? `/api/me/media/${encodeURIComponent(enlargedPhotoId)}/thumbnail` : null}
                onClose={() => setEnlargedPhotoId(null)}
            />
        </>
    );
}
