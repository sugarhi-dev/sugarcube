import { Input, Modal } from 'antd';
import { useEffect, useState } from 'react';

export type ChangesRecipient = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
};

export function RequestChangesDialog({
    user,
    sending,
    onClose,
    onSend,
}: {
    user: ChangesRecipient | null;
    sending: boolean;
    onClose: () => void;
    onSend: (message: string) => void;
}) {
    const [draft, setDraft] = useState('');

    useEffect(() => {
        setDraft('');
    }, [user?.id]);

    const message = draft.trim();

    return (
        <Modal
            title="Request changes"
            open={user !== null}
            okText="Send"
            cancelText="Cancel"
            confirmLoading={sending}
            okButtonProps={{ disabled: message.length === 0 }}
            onOk={() => {
                if (message.length > 0) {
                    onSend(message);
                }
            }}
            onCancel={() => {
                if (!sending) {
                    onClose();
                }
            }}
            destroyOnHidden
        >
            {user ? (
                <div className="changes-dialog">
                    <p>
                        This email goes to {displayName(user)} at {user.email}. Sending it moves their profile back to review.
                    </p>
                    <Input.TextArea
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        rows={6}
                        maxLength={5000}
                        placeholder="Tell them what to change"
                        autoFocus
                    />
                </div>
            ) : null}
        </Modal>
    );
}

function displayName(user: ChangesRecipient): string {
    return [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email;
}
