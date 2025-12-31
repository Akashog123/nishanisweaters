import { Plus } from "lucide-react";

const AnnouncementBanner = () => {
  const announcements = Array(20).fill("WINTER SALE 50% OFF");

  return (
    <div className="bg-primary text-primary-foreground overflow-hidden py-2">
      <div className="flex animate-scroll">
        {announcements.map((text, index) => (
          <div key={index} className="flex items-center gap-8 whitespace-nowrap px-8">
            <span className="text-sm font-medium tracking-wider">{text}</span>
            <Plus className="h-4 w-4" />
          </div>
        ))}
        {announcements.map((text, index) => (
          <div key={`duplicate-${index}`} className="flex items-center gap-8 whitespace-nowrap px-8">
            <span className="text-sm font-medium tracking-wider">{text}</span>
            <Plus className="h-4 w-4" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnnouncementBanner;
