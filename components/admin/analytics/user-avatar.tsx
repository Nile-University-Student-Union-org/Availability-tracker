import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "./format";

export function UserAvatar({
  name,
  email,
  image,
  size = "sm",
}: {
  name: string | null;
  email: string;
  image: string | null;
  size?: "sm" | "xs";
}) {
  return (
    <Avatar className={size === "xs" ? "size-5" : "size-8"}>
      <AvatarImage src={image ?? undefined} referrerPolicy="no-referrer" />
      <AvatarFallback className={size === "xs" ? "text-[9px]" : "text-xs"}>
        {getInitials(name, email)}
      </AvatarFallback>
    </Avatar>
  );
}
