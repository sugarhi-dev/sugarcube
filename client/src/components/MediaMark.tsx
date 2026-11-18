import { PictureFilled, VideoCameraFilled } from '@ant-design/icons';
import type { UserMedia } from '@sugarcube/schema';

const preparing = 'The media is being prepared';

export function MediaMark({ media }: { media: Pick<UserMedia, 'media_type' | 'status'> }) {
    const pending = media.status === 'pending' && media.media_type !== 'photo';
    return (
        <span
            className={pending ? 'media-mark is-pending' : 'media-mark'}
            title={pending ? preparing : undefined}
            aria-hidden={pending ? undefined : true}
        >
            {media.media_type === 'photo' ? <PictureFilled /> : <VideoCameraFilled />}
        </span>
    );
}
