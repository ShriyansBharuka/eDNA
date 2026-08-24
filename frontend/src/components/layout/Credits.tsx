const CREDITS: { name: string; author: string; license: string; url: string }[] = [
  {
    name: "Clownfish",
    author: "Janderk",
    license: "Public domain",
    url: "https://commons.wikimedia.org/wiki/File:Common_clownfish.jpg",
  },
  {
    name: "Green sea turtle",
    author: "Ppmh21",
    license: "CC BY-SA 4.0",
    url: "https://commons.wikimedia.org/wiki/File:Green_turtle_swimming_out_for_a_breath_at_the_GBR.jpg",
  },
  {
    name: "Blue tang",
    author: "Tewy",
    license: "CC BY-SA 3.0",
    url: "https://commons.wikimedia.org/wiki/File:Blue_tang_(Paracanthurus_hepatus)_01.jpg",
  },
  {
    name: "Whale shark",
    author: "istolethetv",
    license: "CC BY 2.0",
    url: "https://commons.wikimedia.org/wiki/File:Whale_Shark_diagonal.jpg",
  },
  {
    name: "Caribbean reef shark",
    author: "Dennis Hipp",
    license: "CC0",
    url: "https://commons.wikimedia.org/wiki/File:Full_Shot_of_a_Caribbean_Reef_Shark_at_Tiger_Beach_Bahamas.jpg",
  },
  {
    name: "Manta ray",
    author: "Tchami",
    license: "CC BY-SA 2.0",
    url: "https://commons.wikimedia.org/wiki/File:Manta_Ray_Maldives.jpg",
  },
  {
    name: "Jellyfish",
    author: "Hans Hillewaert",
    license: "CC BY-SA 4.0",
    url: "https://commons.wikimedia.org/wiki/File:Pelagia_noctiluca_(Sardinia).jpg",
  },
  {
    name: "Giannis D wreck",
    author: "W. Strickling",
    license: "CC BY-SA 4.0",
    url: "https://commons.wikimedia.org/wiki/File:Giannis_D_Bow_2017-04-22_Egypt-8014.jpg",
  },
];

const DATA_SOURCES: { name: string; url: string; note: string }[] = [
  {
    name: "OceanOmics reference DB",
    url: "https://github.com/MinderooFoundation/OceanOmics-AmpliconReference",
    note: "Curated 12S / 16S / COI marine vertebrate barcodes",
  },
  {
    name: "IUCN Red List",
    url: "https://www.iucnredlist.org/",
    note: "Global extinction-risk assessments",
  },
  {
    name: "Wildlife Protection Act",
    url: "https://www.indiacode.nic.in/handle/123456789/1726",
    note: "India's Wild Life (Protection) Act, 1972 schedules",
  },
  {
    name: "GBIF occurrence records",
    url: "https://www.gbif.org/",
    note: "Historical species sightings behind the distribution map",
  },
];

export default function Credits() {
  return (
    <footer className="relative w-full pt-16 pb-14">
      {/* Footer Content Layer */}
      <div className="relative z-10 mx-auto max-w-5xl px-6">
        <h4 className="mb-5 text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300/90 text-glow">
          Data sources &amp; Infrastructure
        </h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {DATA_SOURCES.map((s) => (
            <a
              key={s.name}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="glass glass-hover shape-round block px-4 py-3.5 backdrop-blur-md bg-abyss-950/70 border-white/15 shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
            >
              <span className="flex items-center gap-1.5 text-sm font-medium text-sky-300">
                {s.name}
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17L17 7M17 7H8M17 7v9" />
                </svg>
              </span>
              <span className="mt-1 block text-[11px] leading-snug text-slate-300">{s.note}</span>
            </a>
          ))}
        </div>

        <p className="mt-10 max-w-3xl text-center text-[11px] leading-relaxed text-slate-300/90 mx-auto drop-shadow">
          Marine-life &amp; wreck imagery via Wikimedia Commons:{" "}
          {CREDITS.map((c, i) => (
            <span key={c.name}>
              <a href={c.url} target="_blank" rel="noreferrer" className="underline decoration-slate-500 hover:text-cyan-300">
                {c.name}
              </a>{" "}
              &copy; {c.author} ({c.license})
              {i < CREDITS.length - 1 ? ", " : "."}
            </span>
          ))}
        </p>

        {/* Team Credit */}
        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-xs font-medium tracking-wider text-cyan-300/90 uppercase text-glow">
            Created by team <span className="font-bold text-sky-200">ANVESH</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
