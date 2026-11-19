import { DownOutlined } from '@ant-design/icons';
import type { WorkProfileChoice } from '@sugarcube/schema';
import { useEffect, useId, useRef, useState } from 'react';

export function ViewingMenu({
    label,
    choices,
    currentId,
    busy,
    onSelect,
}: {
    label: string;
    choices: WorkProfileChoice[];
    currentId: string | null;
    busy: boolean;
    onSelect: (id: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const menuId = useId();

    useEffect(() => {
        if (!open) {
            return;
        }

        function onPointerDown(event: PointerEvent): void {
            if (!rootRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        }

        function onKeyDown(event: KeyboardEvent): void {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        }

        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    const currentChoice = choices.find((choice) => choice.id === currentId);
    const buttonLabel = currentChoice ? profileChoiceLabel(currentChoice) : label;

    return (
        <div className="review-viewing-switch" ref={rootRef}>
            <button
                type="button"
                className="review-viewing-menu"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={menuId}
                disabled={busy}
                onClick={() => setOpen((current) => !current)}
            >
                {buttonLabel}
                <DownOutlined />
            </button>
            {open ? (
                <div className="review-viewing-options" id={menuId} role="listbox" aria-label="Work profiles">
                    {choices.map((choice) => {
                        const text = profileChoiceLabel(choice);
                        const current = choice.id === currentId;
                        return (
                            <button
                                key={choice.id}
                                type="button"
                                role="option"
                                aria-selected={current}
                                className={current ? 'review-viewing-option is-current' : 'review-viewing-option'}
                                onClick={() => {
                                    setOpen(false);
                                    if (!current) {
                                        onSelect(choice.id);
                                    }
                                }}
                            >
                                {text}
                            </button>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
}

function profileChoiceLabel(choice: WorkProfileChoice): string {
    const title = choice.title?.trim();
    if (title) {
        return title;
    }
    return [choice.position, choice.city].filter((part): part is string => Boolean(part)).join(' · ') || 'Your profile';
}
