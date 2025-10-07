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
    <div className="relative">
      {!isOpen ? (
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-secondary"
          onClick={() => setIsOpen(true)}
        >
          <Search className="h-5 w-5" />
        </Button>
      ) : (
        <form
          onSubmit={handleSearch}
          className="flex items-center gap-2 animate-in slide-in-from-right duration-300"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 w-64"
              autoFocus
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hover:bg-secondary"
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
