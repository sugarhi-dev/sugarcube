import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import hero from './assets/hero.jpg';
import crewMicheal from './assets/crew-micheal.jpg';
import crewPaloma from './assets/crew-paloma.jpg';
import crewShawn from './assets/crew-shawn.jpg';
import crewLuis from './assets/crew-luis.jpg';
import showreel from './assets/showreel.jpg';
import logoOmnicom from './assets/logo-omnicom.png';
import logoNetflix from './assets/logo-netflix.png';
import logoDeutsch from './assets/logo-deutsch.png';
import logoMonks from './assets/logo-monks.png';
import logoAmazon from './assets/logo-amazon.svg';
import logoAmazonMark from './assets/logo-amazon-mark.svg';
import logoWordmark from './assets/logo-wordmark.svg';
import iconHeart from './assets/icon-heart.svg';
import iconVerified from './assets/icon-verified.svg';
import iconBenefitCrew from './assets/icon-benefit-1.svg';
import iconBenefitSocial from './assets/icon-benefit-2.svg';
import iconBenefitPost from './assets/icon-benefit-3.svg';
import iconPlay from './assets/icon-play.svg';
import iconPlaySm from './assets/icon-play-sm.svg';
import './landing.css';

const crew = [
    {
        name: 'Micheal D — Director — DP',
        meta: 'Mexico City · $10,000/day',
        image: crewMicheal,
        alt: 'The Grand Budapest Hotel facade against autumn hills',
    },
    {
        name: 'Paloma R — Animator',
        meta: 'Remote · $850/day',
        image: crewPaloma,
        alt: 'A brick wall and its reflection in dark water',
    },
    {
        name: 'Shawn P — Director of Photography',
        meta: 'Los Angeles · $1,800/day',
        image: crewShawn,
        alt: 'A person standing on an empty rooftop parking deck',
    },
    {
        name: 'Luis G — Editor · Colorist',
        meta: 'Remote · $950/day',
        image: crewLuis,
        alt: 'A man inspecting a tomato in a grocery aisle',
    },
] as const;

const benefits = [
    {
        title: 'Comercial, music video or film & TV.',
        body: 'Professional crews worldwide... Union and non-union, every department, every city, vetted profiles with reels, verified references and real day rates.',
        icon: iconBenefitCrew,
    },
    {
        title: 'Social Content',
        body: 'Small social shoot we got you covered. optional flat fees and one booking fee. You know exactly what you’re paying from the get-go.',
        icon: iconBenefitSocial,
    },
    {
        title: 'Post Production Teams',
        body: 'You have a post production project? Copythat is the right place, book a remote team or have them come into the office. Everyone from Editors to visual effects artists.',
        icon: iconBenefitPost,
    },
] as const;

const films = [
    { image: crewMicheal, alt: 'The Grand Budapest Hotel facade against autumn hills' },
    { image: crewPaloma, alt: 'A brick wall and its reflection in dark water' },
    { image: crewShawn, alt: 'A person standing on an empty rooftop parking deck' },
] as const;

const footer = [
    ['Company', ['About', 'Blog', 'Careers', 'Press', 'Trust & Safety']],
    ['Crew', ['Become crew', 'Post-production', 'Get Verified', 'Rates & fees', 'Availability']],
    ['Clients', ['Find crew', 'Post a project', 'Budgeting tools', 'Call sheets', 'Net terms']],
    ['Cities', ['Mexico City', 'Los Angeles', 'New York', 'London', 'View all']],
    ['Support', ['Help Center', 'Contact', 'FAQ', 'Terms', 'Privacy']],
] as const;

const stats = [
    ['89,400+', 'Remote Post Production Professional'],
    ['52,400+', 'Verified crew members'],
    ['40+', 'Cities with local crews'],
    ['$0', 'Hidden costs — every rate up front'],
] as const;

export function LandingPage() {
    const [saved, setSaved] = useState<string | null>(null);

    useEffect(() => {
        document.title = 'Sugarcube';
    }, []);

    return (
        <div className="landing">
            <header className="landing-hero">
                <img className="landing-hero-photo" src={hero} alt="" />
                <div className="landing-hero-scrim" />
                <nav className="landing-nav" aria-label="Primary">
                    <a className="landing-brand" href="#top" aria-label="Sugarcube">
                        <img src={logoWordmark} alt="Sugarcube" width={147} height={26} />
                    </a>
                    <div className="landing-nav-links">
                        <a href="#about">About</a>
                        <a href="#who">Who We Serve</a>
                        <a href="#work">Resources</a>
                    </div>
                    <div className="landing-nav-actions">
                        <Link to="/sign-in">Become a Crew Member</Link>
                        <Link className="landing-login" to="/sign-in">Log in</Link>
                    </div>
                </nav>
                <div className="landing-hero-copy" id="top">
                    <h1>A Better Way To Book Crew.</h1>
                    <p>Book professional crew and post production crew, in every city acoss the globe, from preproduction thru delivery.</p>
                    <p className="landing-hero-note">20,400+ verified crew · 40+ cities · transparent rates · post production workflow</p>
                </div>
            </header>

            <section className="landing-arm" id="about">
                <div>
                    <p className="landing-kicker">The operating system for production</p>
                    <h2>Your In-House Production Arm.</h2>
                    <p>A crew and post-production marketplace where every cost is fully transparent. Every shoot starts here — CopyThat is the operating system from prep, to shoot, to post.</p>
                </div>
                <dl>
                    {stats.map(([value, label]) => (
                        <div key={label}>
                            <dt>{value}</dt>
                            <dd>{label}</dd>
                        </div>
                    ))}
                </dl>
            </section>

            <section className="landing-crew" aria-labelledby="featured-crew">
                <div className="landing-section-head">
                    <h2 id="featured-crew">Featured Crew</h2>
                    <a href="#who">Browse all crew →</a>
                </div>
                <ul>
                    {crew.map((person) => (
                        <li key={person.name}>
                            <img src={person.image} alt={person.alt} />
                            <button
                                type="button"
                                aria-pressed={saved === person.name}
                                aria-label={`Save ${person.name}`}
                                onClick={() => setSaved((current) => current === person.name ? null : person.name)}
                            >
                                <img src={iconHeart} alt="" width={15} height={15} />
                            </button>
                            <span className="landing-verified">
                                <img src={iconVerified} alt="" width={12} height={12} />
                                Verified
                            </span>
                            <p>
                                <strong>{person.name}</strong>
                                <span>{person.meta}</span>
                            </p>
                        </li>
                    ))}
                </ul>
            </section>

            <section className="landing-logos" aria-label="Trusted by teams at">
                <p>Trusted by teams at</p>
                <div>
                    <img src={logoOmnicom} alt="Omnicom Production" />
                    <img src={logoNetflix} alt="Netflix" />
                    <img src={logoDeutsch} alt="Deutsch" />
                    <span className="landing-amazon">
                        <img src={logoAmazon} alt="" width={244} height={48} />
                        <img src={logoAmazonMark} alt="Amazon Studios" width={139} height={24} />
                    </span>
                    <img src={logoMonks} alt=".monks" />
                </div>
            </section>

            <section className="landing-who" id="who">
                <p className="landing-kicker">Why CopyThat</p>
                <h2>A Global Marketplace for your project!</h2>
                <div className="landing-who-grid">
                    <ul>
                        {benefits.map((item) => (
                            <li key={item.title}>
                                <span>
                                    <img src={item.icon} alt="" width={21} height={21} />
                                </span>
                                <div>
                                    <h3>{item.title}</h3>
                                    <p>{item.body}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                    <img src={crewShawn} alt="A person standing on an empty rooftop parking deck" />
                </div>
            </section>

            <section className="landing-work" id="work" aria-labelledby="showreel-title">
                <h2 id="showreel-title" className="visually-hidden">Created with CopyThat</h2>
                <figure>
                    <img src={showreel} alt="Three men seated in a wood-paneled train car" />
                    <button type="button" aria-label="Play Nike — Up In The Air">
                        <img src={iconPlay} alt="" width={24} height={24} />
                    </button>
                    <figcaption>
                        <strong>Nike — “Up In The Air”</strong>
                        <span>Dir. Jake Banks · Crewed & posted on CopyThat · Mexico City</span>
                    </figcaption>
                    <span className="landing-duration">2:14</span>
                </figure>
                <div className="landing-films">
                    {films.map((film) => (
                        <button key={film.alt} type="button" aria-label={`Play ${film.alt}`}>
                            <img src={film.image} alt="" />
                            <img src={iconPlaySm} alt="" width={10} height={10} />
                        </button>
                    ))}
                    <a href="#work">Watch more films →</a>
                </div>
            </section>

            <section className="landing-roles" aria-label="Roles">
                <p>Professionals available on Sugarcube.</p>
                <p>Directors&nbsp;&nbsp;&nbsp;&nbsp;Grips&nbsp;&nbsp;&nbsp;&nbsp;Producers&nbsp;&nbsp;&nbsp;&nbsp;Editors • DPs • Gaffers</p>
            </section>

            <section className="landing-earn" id="crew">
                <div>
                    <h2>Remote Post Team.</h2>
                    <p>One account, many hats — different positions in different cities, film and post. Set your rates, share your reel, get booked worldwide.</p>
                    <Link to="/sign-in">Create your crew profile →</Link>
                    <a href="#about">How rates & the 8% booking fee work ↗</a>
                </div>
                <img src={crewLuis} alt="A man inspecting a tomato in a grocery aisle" />
            </section>

            <footer className="landing-footer">
                <div className="landing-footer-brand">
                    <p><span>COPY</span><span>THAT.</span></p>
                    <ul aria-label="Social">
                        <li>f</li>
                        <li>in</li>
                        <li>ig</li>
                        <li>yt</li>
                    </ul>
                </div>
                <div className="landing-footer-cols">
                    {footer.map(([title, links]) => (
                        <nav key={title} aria-label={title}>
                            <h2>{title}</h2>
                            <ul>
                                {links.map((link) => <li key={link}>{link}</li>)}
                            </ul>
                        </nav>
                    ))}
                </div>
                <div className="landing-footer-base">
                    <p>© 2026 CopyThat, Inc. — Every shoot starts here.</p>
                    <p>Terms · Privacy · Sitemap · EN / ES</p>
                </div>
            </footer>
        </div>
    );
}
