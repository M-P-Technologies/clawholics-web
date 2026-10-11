"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "@/lib/router";
import Bow from "../../assets/bow.svg";
import emblem from "../../assets/logo/emblem-pink.png";
import Button from "../../components/ui/Button";
import { LoadingBar } from "../../components/ui/LoadingBar";
import ArtistSpotlight from "../../components/home/ArtistSpotlight";
import FaqList from "../../components/home/FaqList";
import FloatingFacebookButton from "../../components/home/FloatingFacebookButton";
import PhotoStrip from "../../components/home/PhotoStrip";
import QuickContact from "../../components/home/QuickContact";
import Blush from "../../components/ui/Blush";
import LoadError from "../../components/ui/LoadError";
import CtaBand from "../../components/home/CtaBand";
import Section from "../../components/layout/Section";
import { ABOUT_TEXT,DEFAULT_HERO_IMAGE,FACEBOOK_URL,FEATURES,HERO_TEXT,OFFER_TEXT } from "../../data/home";
import { sectionTitleClass } from "../../components/ui/styles";
import { useHome } from "../../hooks/useHome";

export default function Home() {
  const { retryProfile, contentError, reloadContent, isBusy, content, faqs, nailists, about, profileCheckFailed, stripItems } = useHome();
  // A broken or deleted hero photo leaves the soft background instead of a broken-image icon
  const [heroFailed, setHeroFailed] = useState(false);

  if (isBusy) return <LoadingBar label="Loading" />;

  if (contentError && !content) return <LoadError what="home page" onRetry={reloadContent} />;
  if (!content) return <LoadingBar label="Loading" />;

  return (
    <>
      {profileCheckFailed && (
        <div
          role="alert"
          className="fixed inset-x-0 top-16 z-40 bg-crimson px-4 py-2 text-center text-sm text-light-orange"
        >
          We couldn't load your profile right now.{" "}
          <Button
            variant="bare"
            type="button"
            onClick={retryProfile}
            className="font-bold underline"
          >
            Try again
          </Button>
        </div>
      )}
      <header className="relative overflow-x-clip lg:pt-16">
        <Blush className="-left-32 top-40 h-96 w-96" />
        <Blush tone="crimson" className="left-1/3 top-2/3 h-72 w-72" />

        {/* Photo first on phones, starting at the very top so the see-through nav sits on it; on
            desktop it bleeds to the right edge of the screen.
            The hero is as tall as the screen under the nav, up to 44rem on big screens, so on a
            laptop its content is centered in view instead of pushed below the fold. */}
        <div className="relative h-100 lg:absolute lg:inset-y-0 lg:right-0 lg:h-auto lg:w-1/2">
          {!heroFailed && (
            <img
              src={content.home_hero_image || DEFAULT_HERO_IMAGE}
              alt="Soft gel extensions by Clawholics by Max"
              onError={() => setHeroFailed(true)}
              className="absolute inset-0 h-full w-full rounded-bl-4xl object-cover mask-[linear-gradient(to_bottom,black_35%,rgba(0,0,0,0.9)_48%,rgba(0,0,0,0.72)_60%,rgba(0,0,0,0.5)_72%,rgba(0,0,0,0.28)_83%,rgba(0,0,0,0.1)_92%,transparent)] lg:mask-[linear-gradient(to_right,transparent,rgba(0,0,0,0.12)_8%,rgba(0,0,0,0.4)_16%,rgba(0,0,0,0.72)_26%,rgba(0,0,0,0.92)_36%,black_46%),linear-gradient(to_bottom,black_35%,rgba(0,0,0,0.9)_48%,rgba(0,0,0,0.72)_60%,rgba(0,0,0,0.5)_72%,rgba(0,0,0,0.28)_83%,rgba(0,0,0,0.1)_92%,transparent)] lg:mask-intersect object-[50%_50%] lg:object-[50%_48%]"
            />
          )}
        </div>

        <div className="relative mx-auto grid w-full grid-cols-1 max-w-6xl items-center px-4 md:px-8 lg:min-h-[min(44rem,calc(100svh-4rem))] lg:grid-cols-2">
          <div className="relative -mt-4 flex flex-col gap-4 pb-12 md:gap-8 lg:mt-0 lg:py-0">
            <Bow
              aria-hidden="true"
              focusable="false"
              className="-mb-16 h-14 w-14 -rotate-12 text-white md:-mb-22 drop-shadow-md"
            />
            <h1 className="font-display font-normal text-6xl md:text-8xl text-crimson">
              {content.home_title}
            </h1>
            <p className="max-w-lg text-base md:text-lg leading-relaxed text-gray-red/80">
              {HERO_TEXT}
            </p>
            <div className="flex gap-4">
              <Button
                to="/services"
                aria-label="Go to our nail services page to book an appointment"
              >
                Book now
              </Button>
              <Button to="/services" variant="secondary">
                View services
              </Button>
            </div>
          </div>
        </div>
      </header>

      <Section innerClassName="gap-4 md:gap-8">
        <Blush tone="crimson" className="-right-32 top-10 h-80 w-80" />
        <h2 className={sectionTitleClass}>Why choose us?</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-l border-t border-crimson-light/80">
          {FEATURES.map(({ icon: Icon, title, text, to, state }) => (
            <li
              key={title}
              className="border-b border-r border-crimson-light/80 transition-all duration-300 hover:relative hover:z-10 hover:border-crimson hover:shadow-xl hover:shadow-crimson/20 focus-within:relative focus-within:z-10"
            >
              <Link
                to={to}
                state={state}
                className="group flex h-full flex-col bg-light-orange p-4 md:p-8 transition-colors sm:flex-col gap-4 hover:bg-light-orange focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-crimson"
              >
                <div className="w-full flex flex-row sm:flex-col items-center sm:items-start gap-4 sm:gap-8">
                  <div className="flex shrink-0 sm:w-full sm:items-center sm:justify-between">
                    <Icon size={40} className="shrink-0 text-crimson" strokeWidth={1.5} aria-hidden="true" />
                    <ArrowRight
                      size={20}
                      className="hidden -translate-x-2 text-crimson opacity-0 sm:block transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="font-display text-lg font-normal uppercase leading-snug tracking-widest text-gray-red">
                    {title}
                  </h3>
                </div>
                <p className="text-sm leading-relaxed text-gray-red/80">{text}</p>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section>
        <Blush className="-left-40 top-1/2 h-96 w-96" />
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] items-center gap-4 md:gap-8">
          <div className="flex flex-col gap-4 md:gap-8">
            <p className="text-sm text-gray-red/80">Clawholics by Max</p>
            <p className="whitespace-pre-line bg-linear-to-b from-gray-red to-gray-red/50 bg-clip-text font-display text-2xl leading-snug tracking-wide text-transparent md:text-3xl">
              {OFFER_TEXT}
            </p>
            <Button
              to="/services"
              variant="bare" arrow
              aria-label="Browse all of our nail and eyelash services"
              className="text-sm font-bold uppercase tracking-extrawide text-gray-red hover:text-crimson gap-4 self-start"
            >
              Browse all services
            </Button>
          </div>
          {/* The emblem file has ~18% empty margin on every side (circle is 1388 of 2160px),
              so it is scaled up by 2160/1388 to make the circle reach the edges of its box.
              On desktop the box is as tall as the text beside it, so the circle matches the
              text; the image is absolutely positioned so it never stretches the row itself. */}
          <div className="relative mx-auto hidden aspect-square w-full max-w-xs overflow-hidden lg:block lg:aspect-auto lg:h-full lg:max-w-none lg:self-stretch">
            <img
              loading="lazy"
              src={emblem.src}
              alt="Clawholics by Max nail art studio emblem"
              className="absolute inset-0 h-full w-full scale-[1.556] object-contain"
            />
          </div>
        </div>
      </Section>

      {stripItems.length > 0 && (
        <Section bleed>
          <PhotoStrip items={stripItems} />
        </Section>
      )}

      <Section>
        <Blush tone="crimson" className="-right-32 top-1/4 h-80 w-80" />
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 md:gap-8">
          <div className="lg:w-2/3 flex flex-col gap-8">
            <p className="text-sm text-gray-red/80">About us</p>
            <h2 className="font-display text-4xl font-normal uppercase leading-tight tracking-widest text-gray-red md:text-5xl">
              Where every set is made with care
            </h2>
          </div>
          <div className="lg:w-1/3 flex flex-col gap-4 md:gap-8">
            <p className="text-base md:text-lg leading-relaxed text-gray-red/80">{ABOUT_TEXT}</p>
            <Button to="/about" variant="secondary" className="self-start">
              Read our story
            </Button>
          </div>
        </div>
      </Section>

      {nailists.length > 0 && (
        <Section>
          <Blush className="-left-32 top-1/3 h-80 w-80" />
          <ArtistSpotlight artists={nailists} />
        </Section>
      )}

      {about && (
        <Section>
          <Blush tone="crimson" className="-left-32 top-1/4 h-80 w-80" />
          <QuickContact about={about} />
        </Section>
      )}

      {faqs.length > 0 && (
        <Section id="faq" innerClassName="!max-w-4xl gap-4 md:gap-8">
          <Blush className="-right-32 top-1/4 h-80 w-80" />
          <h2 className={sectionTitleClass}>Frequently asked questions</h2>
          <FaqList faqs={faqs} />
        </Section>
      )}

      <CtaBand
        title="Ready for your next set?"
        text="Pick a service and a time. We handle the rest."
        primary={{ to: "/services", label: "Book now" }}
        secondary={{ to: "/contact", label: "Contact us" }}
      />
      <FloatingFacebookButton href={FACEBOOK_URL} />
    </>
  );
}
