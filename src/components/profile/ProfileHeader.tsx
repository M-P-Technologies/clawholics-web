interface ProfileHeaderProps {
  firstName: string;
  /** The Clerk photo; "" for none */
  imageUrl: string;
  memberSince: string;
}

export default function ProfileHeader({ firstName, imageUrl, memberSince }: ProfileHeaderProps) {
  const name = firstName.trim();
  return (
    <header className="flex items-center gap-4">
      <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-crimson bg-light-orange font-display text-2xl text-crimson">
        {imageUrl ? <img src={imageUrl} alt="" className="h-full w-full object-cover" /> : (name[0] ?? "?").toUpperCase()}
      </span>
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-normal uppercase leading-tight tracking-widest text-gray-red md:text-4xl [overflow-wrap:anywhere]">
          {name ? `Hi, ${name}` : "Hi there"}
        </h1>
        {memberSince && <p className="copy-note">Member since {memberSince}</p>}
      </div>
    </header>
  );
}
