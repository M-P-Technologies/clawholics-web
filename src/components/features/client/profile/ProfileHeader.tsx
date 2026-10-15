import { Avatar } from "@/components/atoms";

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
    <div className="flex items-center gap-3">
      <Avatar name={name} imageUrl={imageUrl} size="xl" decorative />
      <div className="min-w-0">
        <h2 className="font-display text-2xl font-normal normal-case leading-tight tracking-normal text-gray-red [overflow-wrap:anywhere]">
          {name ? `Hi, ${name}` : "Hi there"}
        </h2>
        <div className="mt-1 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-crimson-light/50 px-2.5 py-0.5 text-[11px] font-bold text-berry">Client</span>
          {memberSince && <span className="rounded-full bg-sand px-2.5 py-0.5 text-[11px] font-bold text-gray-red">Member since {memberSince}</span>}
        </div>
      </div>
    </div>
  );
}
