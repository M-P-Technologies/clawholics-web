interface ProfileHeaderProps {
  firstName: string;
  /** The Clerk photo; "" for none */
  imageUrl: string;
  memberSince: string;
}

// Who the client is, at the top of the profile panel: photo or initial, a greeting and since when
export default function ProfileHeader({ firstName, imageUrl, memberSince }: ProfileHeaderProps) {
  const name = firstName.trim();
  return (
    <header className="flex items-center gap-3">
      <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-crimson-light/50 font-display text-2xl text-berry">
        {/* eslint-disable-next-line @next/next/no-img-element -- Clerk's image, sized by CSS */}
        {imageUrl ? <img src={imageUrl} alt="" className="h-full w-full object-cover" /> : (name[0] ?? "?").toUpperCase()}
      </span>
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-normal normal-case leading-tight tracking-normal text-gray-red [overflow-wrap:anywhere]">
          {name ? `Hi, ${name}` : "Hi there"}
        </h1>
        <div className="mt-1 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-crimson-light/50 px-2.5 py-0.5 text-[11px] font-bold text-berry">Client</span>
          {memberSince && <span className="rounded-full bg-sand px-2.5 py-0.5 text-[11px] font-bold text-gray-red">Member since {memberSince}</span>}
        </div>
      </div>
    </header>
  );
}
