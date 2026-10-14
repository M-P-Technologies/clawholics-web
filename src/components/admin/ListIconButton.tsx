import { List as ListIcon } from "lucide-react";
import React from "react";
import { Button } from "@/components/atoms";

type ListIconButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
};

const ListIconButton: React.FC<ListIconButtonProps> = ({
  onClick,
  disabled = false,
  className = "",
}) => {
  return (
    <Button
      variant="bare"
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center shrink-0 ${className}`}
    >
      <ListIcon size={20} className="scale-150 origin-center text-crimson" />
    </Button>
  );
};

export default ListIconButton;