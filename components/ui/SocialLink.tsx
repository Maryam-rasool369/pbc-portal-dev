import { Facebook, Linkedin, Calendar, ExternalLink } from "lucide-react";

interface SocialLinkProps {
  type: "facebook" | "linkedin" | "calendly";
  url: string;
}

export default function SocialLink({ type, url }: SocialLinkProps) {
  const getIcon = () => {
    switch (type) {
      case "facebook":
        return <Facebook className="w-4 h-4" />;
      case "linkedin":
        return <Linkedin className="w-4 h-4" />;
      case "calendly":
        return <Calendar className="w-4 h-4" />;
    }
  };

  const getLabel = () => {
    switch (type) {
      case "facebook":
        return "Facebook Profile";
      case "linkedin":
        return "LinkedIn Profile";
      case "calendly":
        return "Schedule Meeting";
    }
  };

  const getBgColor = () => {
    switch (type) {
      case "facebook":
        return "bg-blue-500 hover:bg-blue-600";
      case "linkedin":
        return "bg-[#0A66C2] hover:bg-[#004182]";
      case "calendly":
        return "bg-[#00A2FF] hover:bg-[#0082CC]";
    }
  };

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 px-4 py-2 text-sm text-white rounded-lg transition-colors ${getBgColor()}`}
    >
      {getIcon()}
      <span>{getLabel()}</span>
      <ExternalLink className="w-3 h-3 ml-1" />
    </a>
  );
}
