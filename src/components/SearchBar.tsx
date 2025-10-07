import { Search, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SearchBar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Searching for:", searchQuery);
    // Implement search functionality here
  };

  return (
    <div className="relative flex items-center">
      <Button
        variant="ghost"
        size="icon"
        className="hover:bg-secondary"
        onClick={() => setIsOpen(true)}
      >
        <Search className="h-5 w-5" />
      </Button>

      {isOpen && (
        <form
          onSubmit={handleSearch}
          className="absolute right-0 flex items-center gap-2 bg-background border border-border rounded-md px-2 shadow-lg animate-in slide-in-from-right-5 duration-200"
          style={{ width: '280px' }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              autoFocus
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hover:bg-secondary shrink-0"
            onClick={() => {
              setIsOpen(false);
              setSearchQuery("");
            }}
          >
            <X className="h-5 w-5" />
          </Button>
        </form>
      )}
    </div>
  );
};

export default SearchBar;
