import {
    CaretRightFilled,
    CheckOutlined,
    LeftOutlined,
    PlusOutlined,
    RightOutlined,
    SearchOutlined,
    ShareAltOutlined,
} from '@ant-design/icons';
import { useEffect, useState } from 'react';
import crewLuis from '../../landing/assets/crew-luis.jpg';
import crewMicheal from '../../landing/assets/crew-micheal.jpg';
import crewPaloma from '../../landing/assets/crew-paloma.jpg';
import crewShawn from '../../landing/assets/crew-shawn.jpg';
import showreel from '../../landing/assets/showreel.jpg';
import { useAppSelector, useSession } from '../../store/hooks.ts';
import { ClientFrame, useClientSearch } from './ClientFrame.tsx';
import './client.css';

const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const projects = [
    {
        title: 'Nike — Up In The Air 2027',
        kind: 'Music video · Mexico City',
        detail: 'Shoot Aug 22–24 · 48 crew booked',
        status: 'Shooting in 3 days',
        tone: 'hot',
        image: crewMicheal,
        alt: 'The Grand Budapest Hotel facade against autumn hills',
    },
    {
        title: 'Patagonia — Trail Stories',
        kind: 'Commercial · Mexico City',
        detail: 'Shoot Sep 17–19 · Crewing 12 of 18',
        status: 'Crewing',
        tone: 'idle',
        image: showreel,
        alt: 'Three men seated in a wood-paneled train car',
    },
] as const;

const pastProjects = [
    {
        title: 'Ghirardelli — 2 Day LA',
        meta: 'Wrapped · Nov 2025',
        image: crewShawn,
        alt: 'A person standing on an empty rooftop parking deck',
    },
    {
        title: 'Frigidaire — Dare To...',
        meta: 'Delivered · Jan 2026',
        image: crewLuis,
        alt: 'A man inspecting a tomato in a grocery aisle',
    },
    {
        title: 'Sugarhi Reel Refresh',
        meta: 'Archived · Sep 2025',
        image: crewPaloma,
        alt: 'A brick wall and its reflection in dark water',
    },
] as const;

const shootDays = new Set([21, 22, 23, 24, 25, 26, 27, 28, 29]);
const prepDays = new Set([20]);

export function ClientHome() {
    return (
        <ClientFrame>
            <ClientHomeBody />
        </ClientFrame>
    );
}

function ClientHomeBody() {
    const session = useSession();
    const user = useAppSelector((state) => state.profile.user);
    const focusSearch = useClientSearch();
    const [visibleMonth, setVisibleMonth] = useState(() => new Date(2026, 7, 1));
    const [pastIndex, setPastIndex] = useState(0);
    const firstName = user?.first_name || session?.profile.givenName || 'there';

    useEffect(() => {
        document.title = 'Home — Sugarcube';
    }, []);

    function shiftMonth(delta: number): void {
        setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
    }

    const monthLabel = visibleMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const weeks = monthMatrix(visibleMonth.getFullYear(), visibleMonth.getMonth());
    const showMarks = visibleMonth.getFullYear() === 2026 && visibleMonth.getMonth() === 7;
    const shownPast = [0, 1, 2].flatMap((offset) => {
        const project = pastProjects[(pastIndex + offset) % pastProjects.length];
        return project ? [project] : [];
    });

    return (
                    <div className="client-sheet">
                        <div className="client-welcome">
                            <h1>Welcome back, {firstName}</h1>
                            <button type="button" className="client-search-jump" onClick={focusSearch}>
                                <SearchOutlined /> Go to search
                            </button>
                        </div>

                        <section className="client-card" aria-labelledby="client-projects-heading">
                                <div className="client-card-head">
                                    <h2 id="client-projects-heading">Upcoming projects</h2>
                                    <p>2 projects in prep or shooting this month.</p>
                                </div>
                                <ul className="client-project-list">
                                    {projects.map((project) => (
                                        <li key={project.title}>
                                            <img src={project.image} alt={project.alt} />
                                            <span className="client-project-copy">
                                                <span className="client-project-title">{project.title}</span>
                                                <span>{project.kind}</span>
                                                <span>{project.detail}</span>
                                            </span>
                                            <span className="client-project-side">
                                                <span className={`client-status is-${project.tone}`}>{project.status}</span>
                                                <button type="button" className="client-open">Open <RightOutlined /></button>
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="client-card-actions">
                                    <button type="button" className="client-pink-btn"><PlusOutlined /> Start a project</button>
                                    <button type="button" className="client-quiet-btn" onClick={focusSearch}>Go to search</button>
                                </div>
                            </section>

                        <section className="client-card client-verified">
                            <span className="client-verified-mark" aria-hidden="true"><CheckOutlined /></span>
                            <span>
                                <strong>Get a <em>Verified</em> badge</strong>
                                <span>Verified clients and crew are ID-checked and reference-checked. You get a badge on your profile and projects, and crew respond faster.</span>
                            </span>
                            <button type="button" className="client-quiet-btn">Find out more</button>
                        </section>

                        <div className="client-split client-split-lower">
                            <section className="client-card" aria-labelledby="client-calendar-heading">
                                <div className="client-calendar-head">
                                    <h2 id="client-calendar-heading">Calendar</h2>
                                    <div className="client-month">
                                        <button type="button" aria-label="Previous month" onClick={() => shiftMonth(-1)}><LeftOutlined /></button>
                                        <span>{monthLabel}</span>
                                        <button type="button" aria-label="Next month" onClick={() => shiftMonth(1)}><RightOutlined /></button>
                                    </div>
                                </div>
                                <div className="client-calendar" role="grid" aria-label={monthLabel}>
                                    {weekdays.map((day, index) => (
                                        <span key={`${day}-${index}`} className="client-calendar-dow" role="columnheader">{day}</span>
                                    ))}
                                    {weeks.flat().map((day, index) => {
                                        const prep = showMarks && day !== null && prepDays.has(day);
                                        const shoot = showMarks && day !== null && shootDays.has(day);
                                        const tone = prep ? 'is-prep' : shoot ? 'is-shoot' : '';
                                        return (
                                            <span key={index} className={`client-calendar-day ${tone}`} role="gridcell">
                                                {day ?? ''}
                                            </span>
                                        );
                                    })}
                                </div>
                                <p className="client-legend">
                                    <span><i className="is-shoot" /> Shoot</span>
                                    <span><i className="is-prep" /> Prep</span>
                                </p>
                                {showMarks ? (
                                    <div className="client-next-up">
                                        <span className="client-next-icon" aria-hidden="true"><CaretRightFilled /></span>
                                        <span>
                                            <span className="client-next-label">Next up · Aug 20</span>
                                            <strong>Stage build — Churubusco</strong>
                                        </span>
                                    </div>
                                ) : null}
                                <button type="button" className="client-more">Open full calendar <RightOutlined /></button>
                            </section>

                            <section className="client-watch">
                                <img src={showreel} alt="Three men seated in a wood-paneled train car" />
                                <div className="client-watch-copy">
                                    <h2>Watch how it works</h2>
                                    <p>A two-minute walkthrough — search crew, build a budget, send offers and book. Or hand it all to White Glove.</p>
                                </div>
                                <button type="button" className="client-play" aria-label="Watch video">
                                    <CaretRightFilled />
                                </button>
                                <span className="client-watch-pill"><CaretRightFilled /> Watch video <span>2:14</span></span>
                            </section>
                        </div>

                        <section className="client-past" aria-labelledby="client-past-heading">
                            <div>
                                <h2 id="client-past-heading">Past projects</h2>
                                <p>Wrapped and delivered work. Share a view-only link with clients, or reuse the crew list on your next job.</p>
                                <button type="button" className="client-quiet-btn">Go to projects</button>
                            </div>
                            <div className="client-reel">
                                <button
                                    type="button"
                                    className="client-reel-nav"
                                    aria-label="Previous projects"
                                    onClick={() => setPastIndex((index) => (index + pastProjects.length - 1) % pastProjects.length)}
                                >
                                    <LeftOutlined />
                                </button>
                                <ul>
                                    {shownPast.map((project) => (
                                        <li key={project.title}>
                                            <img src={project.image} alt={project.alt} />
                                            <span className="client-reel-title">
                                                {project.title}
                                                <button type="button" aria-label={`Share ${project.title}`}><ShareAltOutlined /></button>
                                            </span>
                                            <span className="client-reel-meta">{project.meta}</span>
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    type="button"
                                    className="client-reel-nav is-next"
                                    aria-label="Next projects"
                                    onClick={() => setPastIndex((index) => (index + 1) % pastProjects.length)}
                                >
                                    <RightOutlined />
                                </button>
                            </div>
                        </section>
                    </div>
    );
}

function monthMatrix(year: number, month: number): Array<Array<number | null>> {
    const start = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    const cells: Array<number | null> = Array.from({ length: start }, () => null);
    for (let day = 1; day <= days; day += 1) {
        cells.push(day);
    }
    while (cells.length % 7 !== 0) {
        cells.push(null);
    }
    const weeks: Array<Array<number | null>> = [];
    for (let index = 0; index < cells.length; index += 7) {
        weeks.push(cells.slice(index, index + 7));
    }
    return weeks;
}
