import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { HandHelping, Mail, Newspaper, Tag } from "lucide-react";
import { BriefingItemCard } from "@/components/briefing-room/BriefingItemCard";
import type { BriefingItem } from "@/lib/briefingRoom/types";
import { CATEGORY_LABELS, formatPrice, type Category } from "@/lib/classifieds/types";
import { Badge } from "@/components/ui/badge";
import chapterLogo from "@/assets/chapter-logo.jpg";

const CHAPTER_EMAIL = "membership@eaa84.org";

const FEED_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/flyover-public`;

type VolunteerItem = {
  id: string;
  title: string;
  description: string | null;
  num_volunteers: number | null;
};

type ClassifiedItem = {
  id: string;
  title: string;
  description: string | null;
  category: Category;
  tags: string[] | null;
  price: number | null;
  posted_at: string;
  photos: string[];
};

type FlyoverData = {
  briefing: BriefingItem[];
  volunteering: VolunteerItem[];
  classifieds: ClassifiedItem[];
};

function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Newspaper;
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-border pb-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
      </div>
      <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

export default function Flyover() {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Chapter 84 Connect — Flyover";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => {
      document.title = prevTitle;
      meta.remove();
    };
  }, []);

  const { data, isLoading, isError } = useQuery<FlyoverData>({
    queryKey: ["flyover"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const res = await fetch(FEED_URL);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const briefing = data?.briefing ?? [];
  const volunteering = data?.volunteering ?? [];
  const classifieds = data?.classifieds ?? [];

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4">
      <div className="mx-auto max-w-2xl overflow-hidden rounded-xl border border-border bg-card">
        <header className="flex items-center gap-3 border-b border-border bg-muted/40 px-4 py-3">
          <img
            src={chapterLogo}
            alt="EAA Chapter 84"
            className="h-8 w-8 rounded object-cover"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Powered by Chapter84 Connect
            </p>
            <p className="text-xs text-muted-foreground">
              A live look at what is happening in the chapter
            </p>
          </div>
        </header>

        {!isLoading && !isError && (
          <nav
            aria-label="Sections"
            className="sticky top-0 z-10 flex gap-1 overflow-x-auto border-b border-border bg-card px-2 py-1.5"
          >
            {[
              { id: "briefing", label: "Briefing Room", show: briefing.length > 0 },
              { id: "volunteering", label: "Volunteering", show: volunteering.length > 0 },
              { id: "classifieds", label: "Classifieds", show: classifieds.length > 0 },
            ]
              .filter((s) => s.show)
              .map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="inline-flex min-h-[44px] items-center whitespace-nowrap rounded-full px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {s.label}
                </a>
              ))}
          </nav>
        )}

        <div className="space-y-8 px-4 py-5">
          {isLoading && (
            <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
          )}
          {isError && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Content is unavailable right now. Please check back soon.
            </p>
          )}

          {!isLoading && !isError && (
            <>
              <section
                id="briefing"
                className="scroll-mt-14 space-y-3 rounded-xl border border-border bg-muted/40 p-4"
              >
                <SectionHeading
                  icon={Newspaper}
                  title="Briefing Room"
                  description="Aviation news and community stories, edited by our officers. This is what your fellow members are reading — fresh from the hangar."
                />
                {briefing.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No stories published yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {briefing.map((item, i) => (
                      <BriefingItemCard key={item.id} item={item} lead={i === 0} />
                    ))}
                  </div>
                )}
              </section>

              {volunteering.length > 0 && (
                <section
                  id="volunteering"
                  className="scroll-mt-14 space-y-3 rounded-xl border border-border bg-secondary/10 p-4"
                >
                  <SectionHeading
                    icon={HandHelping}
                    title="Volunteering"
                    description="Our chapter runs on volunteers — and it's the fastest way to meet people and feel part of the crew. See where help is needed and step up."
                  />
                  <div className="space-y-3">
                    {volunteering.map((v) => (
                      <article
                        key={v.id}
                        className="rounded-lg border border-border bg-card p-4"
                      >
                        <h3 className="text-sm font-semibold text-foreground">{v.title}</h3>
                        {v.description && (
                          <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                            {v.description}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {!!v.num_volunteers && (
                            <Badge variant="secondary">
                              {v.num_volunteers} volunteer{v.num_volunteers === 1 ? "" : "s"} needed
                            </Badge>
                          )}
                          <a
                            href={`mailto:${CHAPTER_EMAIL}?subject=${encodeURIComponent(`Volunteering: ${v.title}`)}`}
                            className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
                          >
                            <Mail className="h-4 w-4" /> {CHAPTER_EMAIL}
                          </a>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {classifieds.length > 0 && (
                <section
                  id="classifieds"
                  className="scroll-mt-14 space-y-3 rounded-xl border border-border bg-accent/5 p-4"
                >
                  <SectionHeading
                    icon={Tag}
                    title="Classifieds"
                    description="Buy, sell, and swap aviation gear with people you trust. From tools to aircraft projects — check here before you shop anywhere else."
                  />
                  <div className="space-y-3">
                    {classifieds.map((c) => {
                      const price = formatPrice(c.price);
                      return (
                        <article
                          key={c.id}
                          className="rounded-lg border border-border bg-card p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="text-sm font-semibold text-foreground">{c.title}</h3>
                            {price && (
                              <span className="shrink-0 text-sm font-semibold text-foreground">
                                {price}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {CATEGORY_LABELS[c.category] ?? c.category}
                          </p>
                          {c.description && (
                            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                              {c.description}
                            </p>
                          )}
                          {c.photos.length > 0 && (
                            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                              {c.photos.map((src) => (
                                <img
                                  key={src}
                                  src={src}
                                  alt={c.title}
                                  loading="lazy"
                                  className="aspect-square w-full rounded-md border border-border object-cover"
                                />
                              ))}
                            </div>
                          )}
                          {!!c.tags?.length && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {c.tags.map((t) => (
                                <Badge key={t} variant="outline">
                                  {t}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <a
                            href={`mailto:${CHAPTER_EMAIL}?subject=${encodeURIComponent(`Classifieds: ${c.title}`)}`}
                            className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
                          >
                            <Mail className="h-4 w-4" /> {CHAPTER_EMAIL}
                          </a>
                        </article>
                      );
                    })}
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        <footer className="border-t border-border bg-muted/40 px-4 py-3 text-center text-xs text-muted-foreground">
          Chapter members see all of this and more in Chapter84 Connect.
        </footer>
      </div>
    </div>
  );
}
